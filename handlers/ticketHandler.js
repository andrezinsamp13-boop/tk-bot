'use strict';
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField,
} = require('discord.js');
const db = require('../database/db');
const { OWNER_ID } = require('../config/config');
const tm = require('../ticket/ticketManager');
const { generateTranscript } = require('../ticket/transcriptManager');

function isOwner(userId) { return userId === OWNER_ID; }

function hasStaffRole(member, config, buttonId) {
  const button = config.botoes.find(b => b.id === buttonId);
  const roles = (button && button.staffRoleIds.length > 0) ? button.staffRoleIds : config.staffRoleIds;
  return roles.some(r => member.roles.cache.has(r));
}

function canManageTicket(member, ticket, config) {
  if (isOwner(member.id)) return true;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  if (ticket.assumedBy === member.id) return true;
  if (!ticket.assumedBy) return hasStaffRole(member, config, ticket.buttonId);
  return false;
}

async function handleTicketButton(interaction, client) {
  const id = interaction.customId;

  // ─── CRIAR TICKET ────────────────────────────────────────────
  if (id.startsWith('tk_ticket_criar_')) {
    const buttonId = id.replace('tk_ticket_criar_', '');
    const config = db.getConfig();
    const button = config.botoes.find(b => b.id === buttonId);
    if (!button || !button.enabled) {
      return interaction.reply({ content: '❌ Este botão está desabilitado.', ephemeral: true });
    }

    // Cooldown check
    if (config.cooldown && config.cooldown.enabled) {
      const last = db.getCooldown(interaction.user.id);
      if (last) {
        const elapsed = Date.now() - last;
        const cooldownMs = (config.cooldown.segundos || 300) * 1000;
        if (elapsed < cooldownMs) {
          const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
          return interaction.reply({
            content: `⏱️ Aguarde **${remaining}s** antes de abrir outro ticket.`,
            ephemeral: true,
          });
        }
      }
    }

    // Check for existing open ticket of same type
    const existing = db.getOpenTicketByUser(interaction.user.id, buttonId);
    if (existing) {
      return interaction.reply({
        content: `❌ Você já tem um ticket aberto deste tipo: <#${existing.channelId}>`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = await tm.createTicketChannel(interaction.guild, interaction.user, button, config);

      const ticket = db.createTicket({
        channelId: channel.id,
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        buttonId,
      });

      // Set cooldown
      if (config.cooldown && config.cooldown.enabled) {
        db.setCooldown(interaction.user.id, Date.now());
      }

      // Build and send ticket embed
      const embed = tm.buildTicketEmbed(ticket, interaction.user, button, config);
      const rows = tm.buildTicketButtons(channel.id, ticket);
      await channel.send({ content: `${interaction.user}`, embeds: [embed], components: rows });

      // Mencionar cargos do botão
      if (button.mencionarCargos) {
        const staffRoles = button.staffRoleIds.length > 0 ? button.staffRoleIds : config.staffRoleIds;
        if (staffRoles.length > 0) {
          const mentions = staffRoles.map(r => `<@&${r}>`).join(' ');
          await channel.send(mentions);
        }
      }

      // Mensagem automática do botão (ou global)
      const msgTexto = button.mensagem || config.mensagemAutomatica || '';
      if (msgTexto) {
        const msg = msgTexto.replace(/{usuario}/g, `${interaction.user}`);
        if (button.allowCopy) {
          // Texto puro — pode ser copiado pelo usuário
          await channel.send(`>>> ${msg}`);
        } else {
          const autoEmbed = new EmbedBuilder()
            .setColor(config.embedCor || 0xE74C3C)
            .setDescription(msg);
          await channel.send({ embeds: [autoEmbed] });
        }
      }

      // Log opened
      if (config.logChannelId) {
        try {
          const logCh = await client.channels.fetch(config.logChannelId).catch(() => null);
          if (logCh) {
            const logEmbed = new EmbedBuilder()
              .setColor(0x2ECC71)
              .setTitle('🟢 Ticket Aberto')
              .addFields(
                { name: '🎫 Ticket', value: `#${String(ticket.id).padStart(4, '0')}`, inline: true },
                { name: '👤 Usuário', value: `${interaction.user}`, inline: true },
                { name: '📁 Tipo', value: `${button.emoji} ${button.label}`, inline: true },
                { name: '📅 Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              )
              .setTimestamp();
            await logCh.send({ embeds: [logEmbed] });
          }
        } catch {}
      }

      await interaction.editReply({ content: `✅ Seu ticket foi criado: ${channel}` });
    } catch (e) {
      console.error('[CRIAR TICKET]', e);
      await interaction.editReply({ content: `❌ Erro ao criar ticket: ${e.message}` });
    }
    return;
  }

  // ─── ASSUMIR TICKET ──────────────────────────────────────────
  if (id.startsWith('tk_ticket_assumir_')) {
    const channelId = id.replace('tk_ticket_assumir_', '');
    const ticket = db.getTicketByChannel(channelId);
    if (!ticket) return interaction.reply({ content: '❌ Ticket não encontrado.', ephemeral: true });

    const config = db.getConfig();
    const isStaff = hasStaffRole(interaction.member, config, ticket.buttonId);
    if (!isOwner(interaction.user.id) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !isStaff) {
      return interaction.reply({ content: '❌ Você não tem permissão para assumir tickets.', ephemeral: true });
    }
    if (ticket.assumedBy) {
      return interaction.reply({ content: `❌ Este ticket já foi assumido por <@${ticket.assumedBy}>.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const updated = await tm.assumeTicket(interaction.channel, interaction.member, client);
    if (!updated) return interaction.editReply({ content: '❌ Erro ao assumir ticket.' });

    const newEmbed = tm.buildTicketEmbed(updated, { id: updated.userId, toString: () => `<@${updated.userId}>` }, config.botoes.find(b => b.id === ticket.buttonId) || { label: ticket.buttonId, emoji: '🎫', mensagem: '' }, config);
    const rows = tm.buildTicketButtons(channelId, updated);
    await interaction.channel.messages.fetch({ limit: 10 }).then(msgs => {
      const botMsg = [...msgs.values()].find(m => m.author.bot && m.embeds.length > 0 && m.components.length > 0);
      if (botMsg) botMsg.edit({ embeds: [newEmbed], components: rows }).catch(() => {});
    }).catch(() => {});

    const assumeEmbed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setDescription(`🙋 **${interaction.user}** assumiu este ticket!`);
    await interaction.channel.send({ embeds: [assumeEmbed] });

    // Log
    if (config.logChannelId) {
      try {
        const logCh = await client.channels.fetch(config.logChannelId).catch(() => null);
        if (logCh) {
          const logEmbed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('🙋 Ticket Assumido')
            .addFields(
              { name: '🎫 Ticket', value: `#${String(ticket.id).padStart(4, '0')}`, inline: true },
              { name: '🙋 Staff', value: `${interaction.user}`, inline: true },
              { name: '👤 Usuário', value: `<@${ticket.userId}>`, inline: true },
            )
            .setTimestamp();
          await logCh.send({ embeds: [logEmbed] });
        }
      } catch {}
    }

    await interaction.editReply({ content: '✅ Você assumiu este ticket.' });
    return;
  }

  // ─── FECHAR (confirmação) ─────────────────────────────────────
  if (id.startsWith('tk_ticket_fechar_init_')) {
    const channelId = id.replace('tk_ticket_fechar_init_', '');
    const ticket = db.getTicketByChannel(channelId);
    if (!ticket) return interaction.reply({ content: '❌ Ticket não encontrado.', ephemeral: true });

    const config = db.getConfig();
    if (!canManageTicket(interaction.member, ticket, config)) {
      return interaction.reply({ content: '❌ Você não pode fechar este ticket.', ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tk_ticket_fechar_sim_${channelId}`).setLabel('✅ Confirmar Fechamento').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`tk_ticket_fechar_nao_${channelId}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary),
    );
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🔒 Fechar Ticket?')
      .setDescription('Tem certeza que deseja fechar este ticket?\nEsta ação não pode ser desfeita.');

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (id.startsWith('tk_ticket_fechar_nao_')) {
    return interaction.update({ content: '✅ Fechamento cancelado.', embeds: [], components: [] });
  }

  if (id.startsWith('tk_ticket_fechar_sim_')) {
    const channelId = id.replace('tk_ticket_fechar_sim_', '');
    const ticket = db.getTicketByChannel(channelId);
    const config = db.getConfig();
    if (!ticket || !canManageTicket(interaction.member, ticket, config)) {
      return interaction.update({ content: '❌ Sem permissão.', embeds: [], components: [] });
    }

    await interaction.update({ content: '🔒 Fechando ticket...', embeds: [], components: [] });

    const closeEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🔒 Ticket Fechado')
      .setDescription(`Este ticket foi fechado por **${interaction.user}**.\nO canal será apagado em 5 segundos.`);
    await interaction.channel.send({ embeds: [closeEmbed] });

    await tm.closeTicket(interaction.channel, interaction.user, client);
    return;
  }

  // ─── REABRIR ──────────────────────────────────────────────────
  if (id.startsWith('tk_ticket_reabrir_')) {
    const channelId = id.replace('tk_ticket_reabrir_', '');
    const ticket = db.getTicketByChannel(channelId);
    const config = db.getConfig();
    if (!ticket || !canManageTicket(interaction.member, ticket, config)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }

    db.updateTicket(channelId, { status: 'open', closedAt: null, closedBy: null, assumedBy: null });
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setDescription(`🔓 **${interaction.user}** reabriu este ticket.`);
    await interaction.channel.send({ embeds: [embed] });
    return interaction.reply({ content: '✅ Ticket reaberto.', ephemeral: true });
  }

  // ─── ADD USUÁRIO ──────────────────────────────────────────────
  if (id.startsWith('tk_ticket_adduser_')) {
    const channelId = id.replace('tk_ticket_adduser_', '');
    const ticket = db.getTicketByChannel(channelId);
    const config = db.getConfig();
    if (!ticket || !canManageTicket(interaction.member, ticket, config)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }
    const modal = new ModalBuilder().setCustomId(`tk_modal_adduser_${channelId}`).setTitle('➕ Adicionar Usuário ao Ticket');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('userId').setLabel('ID do usuário Discord').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('123456789012345678'),
      ),
    );
    return interaction.showModal(modal);
  }

  // ─── REMOVE USUÁRIO ───────────────────────────────────────────
  if (id.startsWith('tk_ticket_remuser_')) {
    const channelId = id.replace('tk_ticket_remuser_', '');
    const ticket = db.getTicketByChannel(channelId);
    const config = db.getConfig();
    if (!ticket || !canManageTicket(interaction.member, ticket, config)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }
    const modal = new ModalBuilder().setCustomId(`tk_modal_remuser_${channelId}`).setTitle('➖ Remover Usuário do Ticket');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('userId').setLabel('ID do usuário Discord').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('123456789012345678'),
      ),
    );
    return interaction.showModal(modal);
  }

  // ─── TRANSCRIPT ───────────────────────────────────────────────
  if (id.startsWith('tk_ticket_transcript_')) {
    const channelId = id.replace('tk_ticket_transcript_', '');
    const ticket = db.getTicketByChannel(channelId);
    const config = db.getConfig();
    if (!ticket || !canManageTicket(interaction.member, ticket, config)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const attachment = await generateTranscript(ticket, interaction.channel);
      await interaction.editReply({ content: '📄 Transcript gerado:', files: [attachment] });

      if (config.logChannelId) {
        const logCh = await client.channels.fetch(config.logChannelId).catch(() => null);
        if (logCh) {
          const att2 = await generateTranscript(ticket, interaction.channel);
          const logEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('📄 Transcript Gerado')
            .addFields(
              { name: '🎫 Ticket', value: `#${String(ticket.id).padStart(4, '0')}`, inline: true },
              { name: '📋 Gerado por', value: `${interaction.user}`, inline: true },
            ).setTimestamp();
          await logCh.send({ embeds: [logEmbed], files: [att2] });
        }
      }
    } catch (e) {
      await interaction.editReply({ content: `❌ Erro ao gerar transcript: ${e.message}` });
    }
    return;
  }

  // ─── AVALIAÇÃO ────────────────────────────────────────────────
  if (id.startsWith('tk_ticket_avaliar_')) {
    const parts = id.replace('tk_ticket_avaliar_', '').split('_');
    const ticketId = parseInt(parts[0]);
    const stars = parseInt(parts[1]);
    const stars_str = '⭐'.repeat(stars);

    db.saveAvaliacao({ ticketId, userId: interaction.user.id, stars });

    const config = db.getConfig();
    if (config.logChannelId) {
      try {
        const logCh = await client.channels.fetch(config.logChannelId).catch(() => null);
        if (logCh) {
          const logEmbed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('⭐ Nova Avaliação')
            .addFields(
              { name: '🎫 Ticket', value: `#${String(ticketId).padStart(4, '0')}`, inline: true },
              { name: '👤 Usuário', value: `${interaction.user}`, inline: true },
              { name: '⭐ Nota', value: `${stars_str} (${stars}/5)`, inline: true },
            ).setTimestamp();
          await logCh.send({ embeds: [logEmbed] });
        }
      } catch {}
    }

    return interaction.update({
      content: `✅ Obrigado pela avaliação! **${stars_str}** (${stars}/5)`,
      components: [],
      embeds: [],
    });
  }
}

async function handleTicketModal(interaction, client) {
  const id = interaction.customId;

  // Add user
  if (id.startsWith('tk_modal_adduser_')) {
    const channelId = id.replace('tk_modal_adduser_', '');
    const userId = interaction.fields.getTextInputValue('userId').trim();
    try {
      const user = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!user) return interaction.reply({ content: '❌ Usuário não encontrado neste servidor.', ephemeral: true });

      await interaction.channel.permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      const embed = new EmbedBuilder().setColor(0x2ECC71).setDescription(`➕ **${user.user}** foi adicionado ao ticket.`);
      await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({ content: `✅ ${user.user} adicionado.`, ephemeral: true });
    } catch (e) {
      return interaction.reply({ content: `❌ Erro: ${e.message}`, ephemeral: true });
    }
  }

  // Remove user
  if (id.startsWith('tk_modal_remuser_')) {
    const channelId = id.replace('tk_modal_remuser_', '');
    const userId = interaction.fields.getTextInputValue('userId').trim();
    const ticket = db.getTicketByChannel(channelId);

    if (ticket && userId === ticket.userId) {
      return interaction.reply({ content: '❌ Não é possível remover o dono do ticket.', ephemeral: true });
    }
    try {
      await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: false, SendMessages: false });
      const embed = new EmbedBuilder().setColor(0xE74C3C).setDescription(`➖ <@${userId}> foi removido do ticket.`);
      await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({ content: `✅ Usuário removido.`, ephemeral: true });
    } catch (e) {
      return interaction.reply({ content: `❌ Erro: ${e.message}`, ephemeral: true });
    }
  }
}

async function handleTicketSelect(interaction, client) {
  const id = interaction.customId;

  if (id.startsWith('tk_sel_prioridade_')) {
    const channelId = id.replace('tk_sel_prioridade_', '');
    const ticket = db.getTicketByChannel(channelId);
    const config = db.getConfig();
    if (!ticket || !canManageTicket(interaction.member, ticket, config)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }

    const priority = interaction.values[0];
    const updated = db.updateTicket(channelId, { priority });
    const { PRIORITY_LABELS } = require('../config/config');
    const p = PRIORITY_LABELS[priority];

    const embed = new EmbedBuilder()
      .setColor(p.color)
      .setDescription(`🔰 Prioridade alterada para **${p.label}** por **${interaction.user}**.`);
    await interaction.channel.send({ embeds: [embed] });

    // Update main ticket embed
    const button = config.botoes.find(b => b.id === ticket.buttonId) || { label: ticket.buttonId, emoji: '🎫', mensagem: '' };
    const userObj = { id: ticket.userId, toString: () => `<@${ticket.userId}>` };
    const newEmbed = tm.buildTicketEmbed(updated, userObj, button, config);
    const rows = tm.buildTicketButtons(channelId, updated);

    await interaction.channel.messages.fetch({ limit: 10 }).then(msgs => {
      const botMsg = [...msgs.values()].find(m => m.author.bot && m.embeds.length > 0 && m.components.length > 0);
      if (botMsg) botMsg.edit({ embeds: [newEmbed], components: rows }).catch(() => {});
    }).catch(() => {});

    return interaction.deferUpdate();
  }
}

module.exports = { handleTicketButton, handleTicketModal, handleTicketSelect };
