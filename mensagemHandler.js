'use strict';
const {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
} = require('discord.js');
const db = require('../database/db');

async function refreshMensagemPanel(interaction, useUpdate = true) {
  const data = db.getRespostas();
  const respostas = data.respostas || {};
  const blacklist = data.blacklist || [];
  const total = Object.keys(respostas).length;

  const lines = total > 0
    ? Object.entries(respostas).slice(0, 20).map(([p, r]) => `• **${p}** → ${r.slice(0, 60)}${r.length > 60 ? '…' : ''}`).join('\n')
    : '*Nenhuma resposta cadastrada*';

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('💬 Respostas Automáticas — TK BOT')
    .setDescription(`**Respostas ativas:** ${total}\n\n${lines}`)
    .addFields(
      { name: '🚫 Blacklist de palavras', value: blacklist.length > 0 ? blacklist.join(', ') : '*Nenhuma*' },
      { name: '💡 Dica', value: 'Use `@usuario` na resposta para mencionar quem enviou a mensagem.' },
    )
    .setFooter({ text: 'TK BOT • Respostas Automáticas' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk_resp_add').setLabel('➕ Adicionar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tk_resp_remove').setLabel('🗑️ Remover').setStyle(ButtonStyle.Danger).setDisabled(total === 0),
    new ButtonBuilder().setCustomId('tk_resp_blacklist_add').setLabel('🚫 Blacklist').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tk_resp_blacklist_rem').setLabel('✅ Rem. Blacklist').setStyle(ButtonStyle.Secondary).setDisabled(blacklist.length === 0),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk_resp_clear').setLabel('🗑️ Limpar Tudo').setStyle(ButtonStyle.Danger).setDisabled(total === 0),
    new ButtonBuilder().setCustomId('tk_resp_refresh').setLabel('🔄 Atualizar').setStyle(ButtonStyle.Primary),
  );

  const payload = { embeds: [embed], components: [row1, row2] };
  if (useUpdate) return interaction.update(payload);
  return interaction.editReply(payload);
}

async function handleMensagemButton(interaction) {
  const id = interaction.customId;

  if (id === 'tk_resp_add') {
    const modal = new ModalBuilder().setCustomId('tk_modal_resp_add').setTitle('➕ Adicionar Resposta Automática');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('palavra').setLabel('Palavra-chave (ex: vip, preço)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('resposta').setLabel('Resposta (use @usuario para mencionar)').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000),
      ),
    );
    return interaction.showModal(modal);
  }

  if (id === 'tk_resp_remove') {
    const data = db.getRespostas();
    const palavras = Object.keys(data.respostas || {});
    if (palavras.length === 0) return interaction.update({ content: '❌ Nenhuma resposta para remover.' });

    const options = palavras.slice(0, 25).map(p => ({ label: p, value: p, description: (data.respostas[p] || '').slice(0, 50) }));
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('tk_sel_resp_remove').setPlaceholder('Selecione a palavra para remover').addOptions(options),
    );
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tk_resp_refresh').setLabel('◀ Voltar').setStyle(ButtonStyle.Secondary),
    );
    return interaction.update({ content: '🗑️ Selecione qual resposta remover:', components: [row, backRow], embeds: [] });
  }

  if (id === 'tk_resp_blacklist_add') {
    const modal = new ModalBuilder().setCustomId('tk_modal_resp_blacklist').setTitle('🚫 Adicionar à Blacklist');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('palavra').setLabel('Palavra para bloquear (auto-respostas ignoram)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50),
      ),
    );
    return interaction.showModal(modal);
  }

  if (id === 'tk_resp_blacklist_rem') {
    const data = db.getRespostas();
    const blacklist = data.blacklist || [];
    if (blacklist.length === 0) return interaction.update({ content: '✅ Blacklist vazia.' });

    const options = blacklist.slice(0, 25).map(p => ({ label: p, value: p }));
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('tk_sel_resp_blacklist_rem').setPlaceholder('Selecione para remover da blacklist').addOptions(options),
    );
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tk_resp_refresh').setLabel('◀ Voltar').setStyle(ButtonStyle.Secondary),
    );
    return interaction.update({ content: '🚫 Selecione a palavra para remover da blacklist:', components: [row, backRow], embeds: [] });
  }

  if (id === 'tk_resp_clear') {
    const data = db.getRespostas();
    data.respostas = {};
    db.saveRespostas(data);
    return refreshMensagemPanel(interaction);
  }

  if (id === 'tk_resp_refresh') {
    return refreshMensagemPanel(interaction);
  }
}

async function handleMensagemModal(interaction) {
  const id = interaction.customId;

  if (id === 'tk_modal_resp_add') {
    const palavra = interaction.fields.getTextInputValue('palavra').toLowerCase().trim();
    const resposta = interaction.fields.getTextInputValue('resposta').trim();
    const data = db.getRespostas();
    data.respostas = data.respostas || {};
    data.respostas[palavra] = resposta;
    db.saveRespostas(data);
    await interaction.deferUpdate().catch(() => {});
    await refreshMensagemPanel(interaction, false);
    return;
  }

  if (id === 'tk_modal_resp_blacklist') {
    const palavra = interaction.fields.getTextInputValue('palavra').toLowerCase().trim();
    const data = db.getRespostas();
    data.blacklist = data.blacklist || [];
    if (!data.blacklist.includes(palavra)) data.blacklist.push(palavra);
    db.saveRespostas(data);
    await interaction.deferUpdate().catch(() => {});
    await refreshMensagemPanel(interaction, false);
    return;
  }
}

async function handleMensagemSelect(interaction) {
  const id = interaction.customId;

  if (id === 'tk_sel_resp_remove') {
    const palavra = interaction.values[0];
    const data = db.getRespostas();
    delete data.respostas[palavra];
    db.saveRespostas(data);
    return refreshMensagemPanel(interaction);
  }

  if (id === 'tk_sel_resp_blacklist_rem') {
    const palavra = interaction.values[0];
    const data = db.getRespostas();
    data.blacklist = (data.blacklist || []).filter(p => p !== palavra);
    db.saveRespostas(data);
    return refreshMensagemPanel(interaction);
  }
}

module.exports = { handleMensagemButton, handleMensagemModal, handleMensagemSelect };
