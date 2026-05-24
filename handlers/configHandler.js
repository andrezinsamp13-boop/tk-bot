'use strict';
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ChannelSelectMenuBuilder, RoleSelectMenuBuilder, StringSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const db = require('../database/db');

// ─── WIZARD STATE ─────────────────────────────────────────────────────────
function getWizard(userId) {
  if (!global.wizardState) global.wizardState = new Map();
  return global.wizardState.get(userId) || null;
}

function backButton(section) {
  return new ButtonBuilder()
    .setCustomId(section ? `tk_config_sec_${section}` : 'tk_config_main')
    .setLabel('◀ Voltar')
    .setStyle(ButtonStyle.Secondary);
}

// ─── MAIN MENU ────────────────────────────────────────────────────────────
async function showMainMenu(interaction, useUpdate = true) {
  const config = db.getConfig();

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('⚙️ TK BOT — Painel de Configuração')
    .setDescription('Selecione uma seção para configurar o sistema de tickets.')
    .addFields(
      { name: '🎨 Aparência', value: `Banner: ${config.bannerUrl ? '✅' : '❌'} | Cor: \`${config.embedCor}\``, inline: true },
      { name: '📁 Tickets', value: `Categoria: ${config.ticketCategoryId ? '✅' : '❌'} | Cooldown: ${config.cooldown.enabled ? config.cooldown.segundos + 's' : '❌'}`, inline: true },
      { name: '👥 Equipe', value: `Cargos: ${config.staffRoleIds.length} | Logs: ${config.logChannelId ? '✅' : '❌'}`, inline: true },
      { name: '🔘 Botões', value: `${config.botoes.filter(b => b.enabled).length}/${config.botoes.length} ativos`, inline: true },
      { name: '⚙️ Sistema', value: `Lock: ${config.lockStaff ? '✅' : '❌'} | Transcript: ${config.autoTranscript ? '✅' : '❌'} | Auto-fechar: ${config.autoClose.enabled ? config.autoClose.minutos + 'min' : '❌'}`, inline: true },
    )
    .setFooter({ text: 'TK BOT • Configurações' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk_config_sec_aparencia').setLabel('🎨 Aparência').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tk_config_sec_tickets').setLabel('📁 Tickets').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tk_config_sec_equipe').setLabel('👥 Equipe').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tk_config_sec_botoes').setLabel('🔘 Botões').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tk_config_sec_sistema').setLabel('⚙️ Sistema').setStyle(ButtonStyle.Secondary),
  );

  const payload = { embeds: [embed], components: [row] };
  if (useUpdate) return interaction.update(payload);
  return interaction.reply({ ...payload, ephemeral: true });
}

// ─── APARÊNCIA ────────────────────────────────────────────────────────────
async function showAparencia(interaction) {
  const config = db.getConfig();

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🎨 Aparência do Painel')
    .addFields(
      { name: '🖼️ Banner', value: config.bannerUrl ? `[Ver imagem](${config.bannerUrl})` : '`Não configurado`', inline: true },
      { name: '🎨 Cor do Embed', value: `\`${config.embedCor || 0xE74C3C}\``, inline: true },
      { name: '📝 Descrição', value: config.embedDescricao ? config.embedDescricao.slice(0, 200) : '`Não configurada`', inline: false },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk_config_ap_banner').setLabel('🖼️ Banner').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tk_config_ap_cor').setLabel('🎨 Cor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tk_config_ap_descricao').setLabel('📝 Descrição').setStyle(ButtonStyle.Primary),
    backButton(),
  );

  return interaction.update({ embeds: [embed], components: [row] });
}

// ─── TICKETS ──────────────────────────────────────────────────────────────
async function showTickets(interaction) {
  const config = db.getConfig();

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('📁 Configurações de Tickets')
    .addFields(
      { name: '📁 Categoria padrão', value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : '`Não configurada`', inline: true },
      { name: '💬 Mensagem automática', value: config.mensagemAutomatica ? config.mensagemAutomatica.slice(0, 100) + '…' : '`Não configurada`', inline: false },
      { name: '⏱️ Cooldown', value: config.cooldown.enabled ? `${config.cooldown.segundos}s` : '`Desativado`', inline: true },
    );

  const catRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('tk_sel_config_categoria')
      .setPlaceholder('📁 Selecionar Categoria de Tickets')
      .addChannelTypes(ChannelType.GuildCategory),
  );

  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk_config_tk_mensagem').setLabel('💬 Mensagem Auto').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tk_config_tk_cooldown').setLabel('⏱️ Cooldown').setStyle(ButtonStyle.Primary),
    backButton(),
  );

  return interaction.update({ embeds: [embed], components: [catRow, btnRow] });
}

// ─── EQUIPE ───────────────────────────────────────────────────────────────
async function showEquipe(interaction) {
  const config = db.getConfig();

  const cargosList = config.staffRoleIds.length > 0
    ? config.staffRoleIds.map(r => `<@&${r}>`).join(', ')
    : '`Nenhum cargo definido`';

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('👥 Configurações da Equipe')
    .addFields(
      { name: '🛡️ Cargos Staff', value: cargosList, inline: false },
      { name: '📋 Logs', value: config.logChannelId ? `<#${config.logChannelId}>` : '`Não configurado`', inline: true },
    );

  const row = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('tk_sel_config_staff_roles')
      .setPlaceholder('👥 Selecionar cargos staff'),
    backButton(),
  );

  return interaction.update({ embeds: [embed], components: [row] });
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────
module.exports = {
  showMainMenu,
  showAparencia,
  showTickets,
  showEquipe,
};
