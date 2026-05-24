'use strict';
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionsBitField,
} = require('discord.js');
const db = require('../database/db');
const { OWNER_ID } = require('../config/config');
const { getButtonStyle } = require('../ticket/ticketManager');

module.exports = {
  async execute(interaction) {
    const isOwner = interaction.user.id === OWNER_ID;
    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (!isAdmin && !isOwner) {
      return interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    }

    const config = db.getConfig();
    const enabledButtons = config.botoes.filter(b => b.enabled);

    if (enabledButtons.length === 0) {
      return interaction.reply({
        content: '❌ Nenhum botão habilitado. Use `/configurarticket` → **Botões** para habilitar.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.embedCor || 0xE74C3C)
      .setTitle('🎫 Central de Suporte')
      .setDescription(config.embedDescricao || 'Selecione uma categoria abaixo para abrir um ticket.')
      .setFooter({ text: 'TK BOT • Sistema de Tickets | Clique no botão para abrir um ticket' })
      .setTimestamp();

    if (config.bannerUrl) embed.setImage(config.bannerUrl);

    // Build button rows (max 5 per row)
    const rows = [];
    for (let i = 0; i < enabledButtons.length; i += 5) {
      const chunk = enabledButtons.slice(i, i + 5);
      const row = new ActionRowBuilder().addComponents(
        chunk.map(btn =>
          new ButtonBuilder()
            .setCustomId(`tk_ticket_criar_${btn.id}`)
            .setLabel(btn.label)
            .setEmoji(btn.emoji)
            .setStyle(getButtonStyle(btn.cor)),
        ),
      );
      rows.push(row);
    }

    await interaction.reply({ content: '✅ Painel de tickets criado!', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: rows });
  },
};
