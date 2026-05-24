'use strict';

const { REST, Routes, ActivityType } = require('discord.js');

const commands = [
  {
    name: 'criarticket',
    description: 'Cria o painel de tickets no canal atual',
    default_member_permissions: '8',
  },
  {
    name: 'configurarticket',
    description: 'Abre o painel de configuração do bot',
    default_member_permissions: '8',
  },
  {
    name: 'mensagem',
    description: 'Gerencia respostas automáticas',
    default_member_permissions: '8',
  },
];

module.exports = async (client) => {
  console.log(`✅ ${client.user.tag} online!`);

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log('✅ Slash commands registrados!');
  } catch (err) {
    console.error('[READY ERROR]', err);
  }

  client.user.setPresence({
    activities: [
      {
        name: 'TK BOT ONLINE',
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });
};
