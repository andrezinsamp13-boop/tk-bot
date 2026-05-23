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
    : '`Nenhum cargo configurado`';

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('👥 Configurações de Equipe')
    .addFields(
      { name: '👥 Cargos Staff', value: cargosList, inline: false },
      { name: '📋 Canal de Logs', value: config.logChannelId ? `<#${config.logChannelId}>` : '`Não configurado`', inline: true },
    )
    .setDescription('**Nota:** Selecionar cargos irá **adicionar** aos existentes, não substituir.');

  const roleRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('tk_sel_config_cargos_add')
      .setPlaceholder('👥 Adicionar cargos Staff (multi-seleção)')
      .setMinValues(1)
      .setMaxValues(10),
  );
  const logRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('tk_sel_config_logs')
      .setPlaceholder('📋 Selecionar Canal de Logs')
      .addChannelTypes(ChannelType.GuildText),
  );
  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk_config_eq_remcargo').setLabel('🗑️ Remover Cargo').setStyle(ButtonStyle.Danger).setDisabled(config.staffRoleIds.length === 0),
    backButton(),
  );

  return interaction.update({ embeds: [embed], components: [roleRow, logRow, btnRow] });
}

// ─── BOTÕES ───────────────────────────────────────────────────────────────
async function showBotoes(interaction) {
  const config = db.getConfig();
  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🔘 Configuração dos Botões do Painel')
    .setDescription('Selecione um botão abaixo para configurá-lo individualmente.');

  config.botoes.forEach(b => {
    embed.addFields({
      name: `${b.emoji} ${b.label}`,
      value: `Status: ${b.enabled ? '✅ Ativo' : '❌ Inativo'}\nCargos: ${b.staffRoleIds.length > 0 ? b.staffRoleIds.map(r => `<@&${r}>`).join(', ') : 'Global'}\nCategoria: ${b.categoriaId ? `<#${b.categoriaId}>` : 'Padrão'}`,
      inline: true,
    });
  });

  const btnRow = new ActionRowBuilder().addComponents(
    ...config.botoes.map(b =>
      new ButtonBuilder()
        .setCustomId(`tk_config_btn_edit_${b.id}`)
        .setLabel(`${b.emoji} ${b.label}`)
        .setStyle(b.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    ),
    backButton(),
  );

  return interaction.update({ embeds: [embed], components: [btnRow] });
}

// ─── EDITOR DE BOTÃO ─────────────────────────────────────────────────────
async function showBtnEditor(interaction, buttonId) {
  const config = db.getConfig();
  const btn = config.botoes.find(b => b.id === buttonId);
  if (!btn) return interaction.update({ content: '❌ Botão não encontrado.', embeds: [], components: [] });

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle(`✏️ Editando Botão: ${btn.emoji} ${btn.label}`)
    .addFields(
      { name: '📛 Nome', value: btn.label, inline: true },
      { name: '😀 Emoji', value: btn.emoji, inline: true },
      { name: '🎨 Cor', value: btn.cor, inline: true },
      { name: '📁 Categoria', value: btn.categoriaId ? `<#${btn.categoriaId}>` : '`Padrão`', inline: true },
      { name: '👥 Cargos Staff', value: btn.staffRoleIds.length > 0 ? btn.staffRoleIds.map(r => `<@&${r}>`).join(', ') : '`Global`', inline: true },
      { name: '💬 Mensagem Auto', value: btn.mensagem ? btn.mensagem.slice(0, 100) : '`Não configurada`', inline: false },
      { name: '📊 Status', value: btn.enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
      { name: '📋 Msg Copiável', value: btn.allowCopy ? '✅ Ativado — texto puro (selecionável)' : '❌ Desativado — embed normal', inline: true },
      { name: '📣 Mencionar Cargos', value: btn.mencionarCargos ? '✅ Ativado — menciona os cargos ao abrir' : '❌ Desativado', inline: true },
    );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tk_config_btn_nome_${buttonId}`).setLabel('📛 Nome').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tk_config_btn_emoji_${buttonId}`).setLabel('😀 Emoji').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tk_config_btn_mensagem_${buttonId}`).setLabel('💬 Mensagem').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tk_config_btn_toggle_${buttonId}`).setLabel(btn.enabled ? '❌ Desativar' : '✅ Ativar').setStyle(btn.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
  );

  const catRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`tk_sel_btn_cat_${buttonId}`)
      .setPlaceholder('📁 Categoria deste botão')
      .addChannelTypes(ChannelType.GuildCategory),
  );

  const roleRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`tk_sel_btn_cargos_${buttonId}`)
      .setPlaceholder('👥 Adicionar cargos Staff deste botão (multi-seleção)')
      .setMinValues(1)
      .setMaxValues(10),
  );

  const corRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`tk_sel_btn_cor_${buttonId}`)
      .setPlaceholder('🎨 Cor do botão')
      .addOptions([
        { label: '🔵 Azul (Primary)', value: 'Primary', default: btn.cor === 'Primary' },
        { label: '⚫ Cinza (Secondary)', value: 'Secondary', default: btn.cor === 'Secondary' },
        { label: '🟢 Verde (Success)', value: 'Success', default: btn.cor === 'Success' },
        { label: '🔴 Vermelho (Danger)', value: 'Danger', default: btn.cor === 'Danger' },
      ]),
  );

  const backRow = new ActionRowBuilder().addComponents(
    backButton('botoes'),
    new ButtonBuilder().setCustomId(`tk_config_btn_copy_${buttonId}`).setLabel(btn.allowCopy ? '📋 Copiável: ON' : '📋 Copiável: OFF').setStyle(btn.allowCopy ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`tk_config_btn_mencionar_${buttonId}`).setLabel(btn.mencionarCargos ? '📣 Mencionar: ON' : '📣 Mencionar: OFF').setStyle(btn.mencionarCargos ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  return interaction.update({ embeds: [embed], components: [row1, catRow, roleRow, corRow, backRow] });
}

// ─── SISTEMA ──────────────────────────────────────────────────────────────
async function showSistema(interaction) {
  const config = db.getConfig();
  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('⚙️ Configurações do Sistema')
    .addFields(
      { name: '🔒 Lock Staff', value: config.lockStaff ? '✅ Ativado — Apenas quem assumiu pode responder' : '❌ Desativado — Qualquer staff pode responder', inline: false },
      { name: '📄 Transcript Automático', value: config.autoTranscript ? '✅ Ativado — Gera transcript ao fechar' : '❌ Desativado', inline: false },
      { name: '⏱️ Auto-Fechar Inativo', value: config.autoClose.enabled ? `✅ Ativado — ${config.autoClose.minutos} minutos` : '❌ Desativado', inline: false },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk_config_sis_lock').setLabel(config.lockStaff ? '🔓 Desativar Lock' : '🔒 Ativar Lock').setStyle(config.lockStaff ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tk_config_sis_transcript').setLabel(config.autoTranscript ? '📄 Desativar Transcript' : '📄 Ativar Transcript').setStyle(config.autoTranscript ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tk_config_sis_autoclose').setLabel('⏱️ Auto-Fechar').setStyle(ButtonStyle.Primary),
    backButton(),
  );

  return interaction.update({ embeds: [embed], components: [row] });
}

// ─── REMOVE CARGO STAFF ───────────────────────────────────────────────────
async function showRemCargo(interaction) {
  const config = db.getConfig();
  if (config.staffRoleIds.length === 0) return interaction.update({ content: '✅ Nenhum cargo para remover.', embeds: [], components: [] });

  const options = config.staffRoleIds.slice(0, 25).map(r => ({ label: `Cargo ID: ${r}`, value: r, description: `<@&${r}>` }));
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('tk_sel_config_remcargo').setPlaceholder('Selecione o cargo para remover').addOptions(options),
  );
  const backRow = new ActionRowBuilder().addComponents(backButton('equipe'));
  return interaction.update({ content: '🗑️ Selecione o cargo para remover:', embeds: [], components: [row, backRow] });
}

// ─── MAIN BUTTON HANDLER ─────────────────────────────────────────────────
async function handleConfigButton(interaction) {
  const id = interaction.customId;

  if (id === 'tk_config_main') return showMainMenu(interaction, true);
  if (id === 'tk_config_sec_aparencia') return showAparencia(interaction);
  if (id === 'tk_config_sec_tickets') return showTickets(interaction);
  if (id === 'tk_config_sec_equipe') return showEquipe(interaction);
  if (id === 'tk_config_sec_botoes') return showBotoes(interaction);
  if (id === 'tk_config_sec_sistema') return showSistema(interaction);

  // Aparência
  if (id === 'tk_config_ap_banner') {
    const modal = new ModalBuilder().setCustomId('tk_modal_cfg_banner').setTitle('🖼️ URL do Banner');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('url').setLabel('URL da imagem (HTTPS)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('https://i.imgur.com/...'),
    ));
    return interaction.showModal(modal);
  }
  if (id === 'tk_config_ap_cor') {
    const modal = new ModalBuilder().setCustomId('tk_modal_cfg_cor').setTitle('🎨 Cor do Embed');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cor').setLabel('Cor HEX (ex: #FF0000) ou decimal').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('#E74C3C'),
    ));
    return interaction.showModal(modal);
  }
  if (id === 'tk_config_ap_descricao') {
    const modal = new ModalBuilder().setCustomId('tk_modal_cfg_descricao').setTitle('📝 Descrição do Painel');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('descricao').setLabel('Texto de descrição do painel').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000),
    ));
    return interaction.showModal(modal);
  }

  // Tickets
  if (id === 'tk_config_tk_mensagem') {
    const config = db.getConfig();
    const modal = new ModalBuilder().setCustomId('tk_modal_cfg_mensagem_auto').setTitle('💬 Mensagem Automática');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('mensagem').setLabel('Mensagem automática ({usuario} = menção)').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000).setValue(config.mensagemAutomatica || ''),
    ));
    return interaction.showModal(modal);
  }
  if (id === 'tk_config_tk_cooldown') {
    const config = db.getConfig();
    const modal = new ModalBuilder().setCustomId('tk_modal_cfg_cooldown').setTitle('⏱️ Cooldown');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('segundos').setLabel('Segundos de cooldown (0 = desativar)').setStyle(TextInputStyle.Short).setRequired(true).setValue(String(config.cooldown.segundos || 300)),
      ),
    );
    return interaction.showModal(modal);
  }

  // Equipe
  if (id === 'tk_config_eq_remcargo') return showRemCargo(interaction);

  // Botões
  if (id.startsWith('tk_config_btn_edit_')) {
    const btnId = id.replace('tk_config_btn_edit_', '');
    return showBtnEditor(interaction, btnId);
  }
  if (id.startsWith('tk_config_btn_nome_')) {
    const btnId = id.replace('tk_config_btn_nome_', '');
    const config = db.getConfig();
    const btn = config.botoes.find(b => b.id === btnId);
    const modal = new ModalBuilder().setCustomId(`tk_modal_cfg_btn_nome_${btnId}`).setTitle('📛 Nome do Botão');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('nome').setLabel('Nome do botão').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setValue(btn?.label || ''),
    ));
    return interaction.showModal(modal);
  }
  if (id.startsWith('tk_config_btn_emoji_')) {
    const btnId = id.replace('tk_config_btn_emoji_', '');
    const config = db.getConfig();
    const btn = config.botoes.find(b => b.id === btnId);
    const modal = new ModalBuilder().setCustomId(`tk_modal_cfg_btn_emoji_${btnId}`).setTitle('😀 Emoji do Botão');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('emoji').setLabel('Emoji (ex: 🎫 ou ID do emoji)').setStyle(TextInputStyle.Short).setRequired(true).setValue(btn?.emoji || ''),
    ));
    return interaction.showModal(modal);
  }
  if (id.startsWith('tk_config_btn_mensagem_')) {
    const btnId = id.replace('tk_config_btn_mensagem_', '');
    const config = db.getConfig();
    const btn = config.botoes.find(b => b.id === btnId);
    const modal = new ModalBuilder().setCustomId(`tk_modal_cfg_btn_msg_${btnId}`).setTitle('💬 Mensagem Automática do Botão');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('mensagem').setLabel('Mensagem ao abrir este tipo de ticket').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000).setValue(btn?.mensagem || ''),
    ));
    return interaction.showModal(modal);
  }
  if (id.startsWith('tk_config_btn_toggle_')) {
    const btnId = id.replace('tk_config_btn_toggle_', '');
    const config = db.getConfig();
    const idx = config.botoes.findIndex(b => b.id === btnId);
    if (idx !== -1) { config.botoes[idx].enabled = !config.botoes[idx].enabled; db.saveConfig(config); }
    return showBtnEditor(interaction, btnId);
  }

  if (id.startsWith('tk_config_btn_copy_')) {
    const btnId = id.replace('tk_config_btn_copy_', '');
    const config = db.getConfig();
    const idx = config.botoes.findIndex(b => b.id === btnId);
    if (idx !== -1) { config.botoes[idx].allowCopy = !config.botoes[idx].allowCopy; db.saveConfig(config); }
    return showBtnEditor(interaction, btnId);
  }

  if (id.startsWith('tk_config_btn_mencionar_')) {
    const btnId = id.replace('tk_config_btn_mencionar_', '');
    const config = db.getConfig();
    const idx = config.botoes.findIndex(b => b.id === btnId);
    if (idx !== -1) { config.botoes[idx].mencionarCargos = !config.botoes[idx].mencionarCargos; db.saveConfig(config); }
    return showBtnEditor(interaction, btnId);
  }

  // Sistema
  if (id === 'tk_config_sis_lock') {
    const config = db.getConfig();
    config.lockStaff = !config.lockStaff;
    db.saveConfig(config);
    return showSistema(interaction);
  }
  if (id === 'tk_config_sis_transcript') {
    const config = db.getConfig();
    config.autoTranscript = !config.autoTranscript;
    db.saveConfig(config);
    return showSistema(interaction);
  }
  if (id === 'tk_config_sis_autoclose') {
    const config = db.getConfig();
    const modal = new ModalBuilder().setCustomId('tk_modal_cfg_autoclose').setTitle('⏱️ Auto-Fechar Tickets Inativos');
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('minutos').setLabel('Minutos de inatividade (0 = desativar)').setStyle(TextInputStyle.Short).setRequired(true).setValue(String(config.autoClose.minutos || 60)),
    ));
    return interaction.showModal(modal);
  }
}

// ─── MODAL HANDLER ────────────────────────────────────────────────────────
async function handleConfigModal(interaction) {
  const id = interaction.customId;
  const config = db.getConfig();
  let section = 'aparencia';

  if (id === 'tk_modal_cfg_banner') {
    const url = interaction.fields.getTextInputValue('url').trim();
    config.bannerUrl = url || null;
    section = 'aparencia';
  } else if (id === 'tk_modal_cfg_cor') {
    const cor = interaction.fields.getTextInputValue('cor').trim();
    const hex = cor.startsWith('#') ? parseInt(cor.replace('#', ''), 16) : parseInt(cor);
    config.embedCor = isNaN(hex) ? 0xE74C3C : hex;
    section = 'aparencia';
  } else if (id === 'tk_modal_cfg_descricao') {
    config.embedDescricao = interaction.fields.getTextInputValue('descricao');
    section = 'aparencia';
  } else if (id === 'tk_modal_cfg_mensagem_auto') {
    config.mensagemAutomatica = interaction.fields.getTextInputValue('mensagem');
    section = 'tickets';
  } else if (id === 'tk_modal_cfg_cooldown') {
    const seg = parseInt(interaction.fields.getTextInputValue('segundos')) || 0;
    config.cooldown = { enabled: seg > 0, segundos: seg };
    section = 'tickets';
  } else if (id === 'tk_modal_cfg_autoclose') {
    const min = parseInt(interaction.fields.getTextInputValue('minutos')) || 0;
    config.autoClose = { enabled: min > 0, minutos: min };
    section = 'sistema';
  } else if (id.startsWith('tk_modal_cfg_btn_nome_')) {
    const btnId = id.replace('tk_modal_cfg_btn_nome_', '');
    const idx = config.botoes.findIndex(b => b.id === btnId);
    if (idx !== -1) config.botoes[idx].label = interaction.fields.getTextInputValue('nome');
    section = `btn_edit_${btnId}`;
  } else if (id.startsWith('tk_modal_cfg_btn_emoji_')) {
    const btnId = id.replace('tk_modal_cfg_btn_emoji_', '');
    const idx = config.botoes.findIndex(b => b.id === btnId);
    if (idx !== -1) config.botoes[idx].emoji = interaction.fields.getTextInputValue('emoji');
    section = `btn_edit_${btnId}`;
  } else if (id.startsWith('tk_modal_cfg_btn_msg_')) {
    const btnId = id.replace('tk_modal_cfg_btn_msg_', '');
    const idx = config.botoes.findIndex(b => b.id === btnId);
    if (idx !== -1) config.botoes[idx].mensagem = interaction.fields.getTextInputValue('mensagem');
    section = `btn_edit_${btnId}`;
  }

  db.saveConfig(config);

  // Acknowledge the modal and redirect
  await interaction.deferUpdate().catch(() => {});

  const wizard = getWizard(interaction.user.id);
  if (!wizard) return;

  if (section.startsWith('btn_edit_')) {
    const btnId = section.replace('btn_edit_', '');
    await showBtnEditorViaWizard(wizard, btnId);
  } else {
    const sectionMap = { aparencia: showAparencia, tickets: showTickets, equipe: showEquipe, botoes: showBotoes, sistema: showSistema };
    const fn = sectionMap[section];
    if (fn) await fn({ update: (p) => wizard.editReply(p) });
  }
}

async function showBtnEditorViaWizard(wizard, buttonId) {
  const config = db.getConfig();
  const btn = config.botoes.find(b => b.id === buttonId);
  if (!btn) return;

  const fakeInteraction = { update: (p) => wizard.editReply(p) };
  await showBtnEditor(fakeInteraction, buttonId);
}

// ─── SELECT HANDLER ───────────────────────────────────────────────────────
async function handleConfigSelect(interaction) {
  const id = interaction.customId;
  const config = db.getConfig();

  // Categoria padrão
  if (id === 'tk_sel_config_categoria') {
    config.ticketCategoryId = interaction.values[0];
    db.saveConfig(config);
    await interaction.deferUpdate();
    return showTickets({ update: (p) => interaction.editReply(p) });
  }

  // Staff roles global (ADD to existing)
  if (id === 'tk_sel_config_cargos_add') {
    const selected = interaction.values;
    config.staffRoleIds = [...new Set([...config.staffRoleIds, ...selected])];
    db.saveConfig(config);
    await interaction.deferUpdate();
    return showEquipe({ update: (p) => interaction.editReply(p) });
  }

  // Logs channel
  if (id === 'tk_sel_config_logs') {
    config.logChannelId = interaction.values[0];
    db.saveConfig(config);
    await interaction.deferUpdate();
    return showEquipe({ update: (p) => interaction.editReply(p) });
  }

  // Remove staff cargo
  if (id === 'tk_sel_config_remcargo') {
    const remove = interaction.values[0];
    config.staffRoleIds = config.staffRoleIds.filter(r => r !== remove);
    db.saveConfig(config);
    await interaction.deferUpdate();
    return showEquipe({ update: (p) => interaction.editReply(p) });
  }

  // Button-specific categoria
  if (id.startsWith('tk_sel_btn_cat_')) {
    const btnId = id.replace('tk_sel_btn_cat_', '');
    const idx = config.botoes.findIndex(b => b.id === btnId);
    if (idx !== -1) { config.botoes[idx].categoriaId = interaction.values[0]; db.saveConfig(config); }
    await interaction.deferUpdate();
    return showBtnEditor({ update: (p) => interaction.editReply(p) }, btnId);
  }

  // Button-specific cargos (ADD)
  if (id.startsWith('tk_sel_btn_cargos_')) {
    const btnId = id.replace('tk_sel_btn_cargos_', '');
    const idx = config.botoes.findIndex(b => b.id === btnId);
    if (idx !== -1) {
      config.botoes[idx].staffRoleIds = [...new Set([...config.botoes[idx].staffRoleIds, ...interaction.values])];
      db.saveConfig(config);
    }
    await interaction.deferUpdate();
    return showBtnEditor({ update: (p) => interaction.editReply(p) }, btnId);
  }

  // Button color
  if (id.startsWith('tk_sel_btn_cor_')) {
    const btnId = id.replace('tk_sel_btn_cor_', '');
    const idx = config.botoes.findIndex(b => b.id === btnId);
    if (idx !== -1) { config.botoes[idx].cor = interaction.values[0]; db.saveConfig(config); }
    await interaction.deferUpdate();
    return showBtnEditor({ update: (p) => interaction.editReply(p) }, btnId);
  }
}

module.exports = {
  showMainMenu,
  handleConfigButton,
  handleConfigModal,
  handleConfigSelect,
};
