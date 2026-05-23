'use strict';
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField,
} = require('discord.js');
const db = require('../database/db');
const { OWNER_ID } = require('../config/config');

module.exports = {
  async execute(interaction) {
    const isOwner = interaction.user.id === OWNER_ID;
    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (!isAdmin && !isOwner) {
      return interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    }

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
        { name: '🚫 Blacklist de palavras', value: blacklist.length > 0 ? blacklist.join(', ') : '*Nenhuma*', inline: false },
        { name: '💡 Dica', value: 'Use `@usuario` na resposta para mencionar quem enviou a mensagem.', inline: false },
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

    await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
  },
};
