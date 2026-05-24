'use strict';
const {
  PermissionsBitField, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType,
} = require('discord.js');
const db = require('../database/db');
const { OWNER_ID, PRIORITY_LABELS } = require('../config/config');

function getButtonStyle(cor) {
  const map = { Danger: ButtonStyle.Danger, Primary: ButtonStyle.Primary, Secondary: ButtonStyle.Secondary, Success: ButtonStyle.Success };
  return map[cor] || ButtonStyle.Primary;
}

function buildTicketButtons(channelId, ticket) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tk_ticket_assumir_${channelId}`).setLabel('Assumir').setEmoji('🙋').setStyle(ButtonStyle.Success).setDisabled(!!ticket.assumedBy),
    new ButtonBuilder().setCustomId(`tk_ticket_fechar_init_${channelId}`).setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`tk_ticket_adduser_${channelId}`).setLabel('Add Usuário').setEmoji('➕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`tk_ticket_remuser_${channelId}`).setLabel('Rem Usuário').setEmoji('➖').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tk_ticket_transcript_${channelId}`).setLabel('Transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`tk_ticket_reabrir_${channelId}`).setLabel('Reabrir').setEmoji('🔓').setStyle(ButtonStyle.Primary).setDisabled(ticket.status === 'open'),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`tk_sel_prioridade_${channelId}`)
      .setPlaceholder('🔰 Definir Prioridade')
      .addOptions([
        { label: '🟢 Normal', value: 'normal', description: 'Prioridade padrão' },
        { label: '🟡 Médio', value: 'medio', description: 'Prioridade média' },
        { label: '🔴 Alto', value: 'alto', description: 'Alta prioridade' },
        { label: '🚨 Urgente', value: 'urgente', description: 'Urgente — atendimento imediato' },
      ]),
  );
  return [row1, row2, row3];
}

function buildTicketEmbed(ticket, user, button, config) {
  const priority = PRIORITY_LABELS[ticket.priority] || PRIORITY_LABELS.normal;
  const openedAt = new Date(ticket.openedAt);
  return new EmbedBuilder()
    .setColor(priority.color)
    .setTitle(`🎫 Ticket #${String(ticket.id).padStart(4, '0')} — ${button.label}`)
    .setDescription(`Olá ${user}! Seu ticket foi aberto.\n${button.mensagem}`)
    .addFields(
      { name: '👤 Usuário', value: `${user}`, inline: true },
      { name: '📁 Tipo', value: `${button.emoji} ${button.label}`, inline: true },
      { name: '🔰 Prioridade', value: priority.label, inline: true },
      { name: '📅 Aberto em', value: `<t:${Math.floor(openedAt.getTime() / 1000)}:F>`, inline: true },
      { name: '🙋 Assumido por', value: ticket.assumedBy ? `<@${ticket.assumedBy}>` : '`Ninguém`', inline: true },
      { name: '📊 Status', value: ticket.status === 'open' ? '🟢 Aberto' : '🔴 Fechado', inline: true },
    )
    .setFooter({ text: `TK BOT • ID: ${ticket.channelId}` })
    .setTimestamp();
}

async function createTicketChannel(guild, user, button, config) {
  const categoryId = button.categoriaId || config.ticketCategoryId;
  const staffRoles = button.staffRoleIds && button.staffRoleIds.length > 0
    ? button.staffRoleIds
    : config.staffRoleIds;

  const overwrites = [
    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
      ],
    },
    {
      id: guild.client.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
  ];

  for (const roleId of staffRoles) {
    try {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      });
    } catch {}
  }

  if (OWNER_ID) {
    overwrites.push({
      id: OWNER_ID,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    });
  }

  const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user'}`;

  const options = {
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
  };
  if (categoryId) {
    try {
      const cat = await guild.channels.fetch(categoryId).catch(() => null);
      if (cat) options.parent = cat;
    } catch {}
  }

  return guild.channels.create(options);
}

async function assumeTicket(channel, staff, client) {
  const ticket = db.getTicketByChannel(channel.id);
  if (!ticket) return null;

  const config = db.getConfig();
  const allStaffRoles = config.staffRoleIds;

  // Get button-specific staff roles
  const button = config.botoes.find(b => b.id === ticket.buttonId);
  if (button && button.staffRoleIds.length > 0) {
    allStaffRoles.push(...button.staffRoleIds);
  }

  // If lockStaff, deny send to all staff roles (except the one who assumed)
  if (config.lockStaff) {
    const uniqueRoles = [...new Set(allStaffRoles)];
    for (const roleId of uniqueRoles) {
      try {
        const role = channel.guild.roles.cache.get(roleId);
        if (role) {
          await channel.permissionOverwrites.edit(roleId, { SendMessages: false });
        }
      } catch {}
    }

    // Grant to the one who assumed
    await channel.permissionOverwrites.edit(staff.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    // Owner always has access
    if (OWNER_ID) {
      try {
        await channel.permissionOverwrites.edit(OWNER_ID, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
      } catch {}
    }
  }

  return db.updateTicket(channel.id, { assumedBy: staff.id });
}

async function closeTicket(channel, closedBy, client, skipDelay = false) {
  const ticket = db.getTicketByChannel(channel.id);
  if (!ticket) return;

  const config = db.getConfig();
  const updated = db.updateTicket(channel.id, {
    status: 'closed',
    closedAt: new Date().toISOString(),
    closedBy: closedBy.id,
  });

  // Log
  if (config.logChannelId) {
    try {
      const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('🔒 Ticket Fechado')
          .addFields(
            { name: '🎫 Ticket', value: `#${String(ticket.id).padStart(4, '0')}`, inline: true },
            { name: '👤 Usuário', value: `<@${ticket.userId}>`, inline: true },
            { name: '🔒 Fechado por', value: `${closedBy}`, inline: true },
            { name: '📁 Tipo', value: ticket.buttonId || 'N/A', inline: true },
            { name: '🙋 Assumido por', value: ticket.assumedBy ? `<@${ticket.assumedBy}>` : '`Ninguém`', inline: true },
            {
              name: '⏱️ Duração',
              value: ticket.openedAt ? formatDuration(new Date() - new Date(ticket.openedAt)) : 'N/A',
              inline: true,
            },
          )
          .setTimestamp();

        if (config.autoTranscript && ticket.messages && ticket.messages.length > 0) {
          const transcript = ticket.messages
            .map(m => `[${m.time}] ${m.author}: ${m.content}`)
            .join('\n');
          const { AttachmentBuilder } = require('discord.js');
          const buffer = Buffer.from(transcript, 'utf8');
          const attach = new AttachmentBuilder(buffer, { name: `transcript-${ticket.id}.txt` });
          await logChannel.send({ embeds: [embed], files: [attach] });
        } else {
          await logChannel.send({ embeds: [embed] });
        }
      }
    } catch (e) { console.error('[LOG ERROR]', e.message); }
  }

  // Send rating DM
  try {
    const user = await client.users.fetch(ticket.userId).catch(() => null);
    if (user) {
      const ratingRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tk_ticket_avaliar_${ticket.id}_1`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tk_ticket_avaliar_${ticket.id}_2`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tk_ticket_avaliar_${ticket.id}_3`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`tk_ticket_avaliar_${ticket.id}_4`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`tk_ticket_avaliar_${ticket.id}_5`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success),
      );
      const ratingEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('⭐ Avalie seu Atendimento')
        .setDescription('Obrigado por usar nosso suporte!\nComo você avalia o atendimento recebido?\n\nClique em uma estrela para avaliar de 1 a 5.')
        .setFooter({ text: 'TK BOT • Sistema de Avaliação' });
      await user.send({ embeds: [ratingEmbed], components: [ratingRow] }).catch(() => {});
    }
  } catch {}

  // Delete channel after delay
  if (!skipDelay) {
    setTimeout(async () => {
      try { await channel.delete('Ticket fechado'); } catch {}
    }, 5000);
  }
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

module.exports = {
  buildTicketButtons,
  buildTicketEmbed,
  createTicketChannel,
  assumeTicket,
  closeTicket,
  formatDuration,
  getButtonStyle,
};
