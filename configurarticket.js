'use strict';
const { PermissionsBitField } = require('discord.js');
const { OWNER_ID } = require('../config/config');
const { showMainMenu } = require('../handlers/configHandler');

module.exports = {
  async execute(interaction) {
    const isOwner = interaction.user.id === OWNER_ID;
    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (!isAdmin && !isOwner) {
      return interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    }

    // Store original interaction for later modal updates
    if (!global.wizardState) global.wizardState = new Map();
    global.wizardState.set(interaction.user.id, interaction);

    await showMainMenu(interaction, false); // false = first reply (not update)
  },
};
