'use strict';
const { handleTicketButton, handleTicketModal, handleTicketSelect } = require('../handlers/ticketHandler');
const { handleConfigButton, handleConfigModal, handleConfigSelect } = require('../handlers/configHandler');
const { handleMensagemButton, handleMensagemModal, handleMensagemSelect } = require('../handlers/mensagemHandler');

const commands = {
  criarticket: require('../commands/criarticket'),
  configurarticket: require('../commands/configurarticket'),
  mensagem: require('../commands/mensagem'),
};

module.exports = async (interaction, client) => {
  try {
    // ─── SLASH COMMANDS ────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const cmd = commands[interaction.commandName];
      if (cmd) await cmd.execute(interaction, client);
      return;
    }

    const id = interaction.customId || '';

    // ─── BUTTONS ───────────────────────────────────────────────
    if (interaction.isButton()) {
      if (id.startsWith('tk_ticket_') || id.startsWith('tk_modal_adduser') || id.startsWith('tk_modal_remuser')) {
        return handleTicketButton(interaction, client);
      }
      if (id.startsWith('tk_config_')) {
        return handleConfigButton(interaction, client);
      }
      if (id.startsWith('tk_resp_')) {
        return handleMensagemButton(interaction, client);
      }
      return;
    }

    // ─── MODALS ────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (id.startsWith('tk_modal_adduser_') || id.startsWith('tk_modal_remuser_')) {
        return handleTicketModal(interaction, client);
      }
      if (id.startsWith('tk_modal_cfg_')) {
        return handleConfigModal(interaction, client);
      }
      if (id.startsWith('tk_modal_resp_')) {
        return handleMensagemModal(interaction, client);
      }
      return;
    }

    // ─── SELECT MENUS ──────────────────────────────────────────
    if (interaction.isStringSelectMenu() || interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu()) {
      if (id.startsWith('tk_sel_prioridade_')) {
        return handleTicketSelect(interaction, client);
      }
      if (id.startsWith('tk_sel_config_') || id.startsWith('tk_sel_btn_')) {
        return handleConfigSelect(interaction, client);
      }
      if (id.startsWith('tk_sel_resp_')) {
        return handleMensagemSelect(interaction, client);
      }
      return;
    }

  } catch (err) {
    console.error('[INTERACTION ERROR]', err);
    const errMsg = { content: '❌ Ocorreu um erro ao processar esta interação.', ephemeral: true };
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply(errMsg).catch(() => {});
    }
  }
};
