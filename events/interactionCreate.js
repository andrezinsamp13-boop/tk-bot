'use strict';

const commands = {
  criarticket: require('../commands/criarticket'),
  configurarticket: require('../commands/configurarticket'),
  mensagem: require('../commands/mensagem'),
};

module.exports = async (interaction, client) => {
  try {

    if (interaction.isChatInputCommand()) {

      const cmd = commands[interaction.commandName];

      if (!cmd) {
        return interaction.reply({
          content: '❌ Comando não encontrado.',
          ephemeral: true,
        });
      }

      await cmd.execute(interaction, client);
    }

  } catch (err) {

    console.error('[INTERACTION ERROR]', err);

    if (!interaction.replied) {
      interaction.reply({
        content: '❌ Ocorreu um erro ao executar este comando.',
        ephemeral: true,
      }).catch(() => {});
    }

  }
};
