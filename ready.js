'use strict';
const { REST, Routes, ActivityType } = require('discord.js');
const { STATUS_LIST } = require('../config/config');
const db = require('../database/db');

const commands = [
  {
    name: 'criarticket',
    description: 'Cria o painel de tickets no canal atual',
    default_member_permissions: '8', // Administrator
  },
  {
    name: 'configurarticket',
    description: 'Abre o painel de configuração completo do sistema de tickets',
    default_member_permissions: '8',
  },
  {
    name: 'mensagem',
    description: 'Gerencia as respostas automáticas do bot',
    default_member_permissions: '8',
  },
];

module.exports = async (client) => {
  console.log(`✅ TK BOT online como ${client.user.tag}`);

  // Register slash commands
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Slash commands registrados!');
  } catch (e) {
    console.error('[COMMANDS ERROR]', e.message);
  }

  // Rotating status
  let statusIndex = 0;
  function updateStatus() {
    const s = STATUS_LIST[statusIndex % STATUS_LIST.length];
    const typeMap = { PLAYING: ActivityType.Playing, WATCHING: ActivityType.Watching, LISTENING: ActivityType.Listening };
    client.user.setPresence({
      activities: [{ name: s.name, type: typeMap[s.type] || ActivityType.Playing }],
      status: 'online',
    });
    statusIndex++;
  }
  updateStatus();
  setInterval(updateStatus, 20000);

  // Auto-close inactive tickets
  setInterval(async () => {
    const config = db.getConfig();
    if (!config.autoClose || !config.autoClose.enabled) return;
    const minutosMs = (config.autoClose.minutos || 60) * 60 * 1000;
    const ticketData = db.getTickets();
    const now = Date.now();

    for (const ticket of ticketData.tickets) {
      if (ticket.status !== 'open') continue;
      const lastActivity = new Date(ticket.lastActivity || ticket.openedAt).getTime();
      if (now - lastActivity < minutosMs) continue;

      try {
        const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
        if (!channel) {
          db.updateTicket(ticket.channelId, { status: 'closed', closedAt: new Date().toISOString() });
          continue;
        }
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('⏱️ Ticket Fechado Automaticamente')
          .setDescription(`Este ticket foi fechado automaticamente por inatividade de **${config.autoClose.minutos} minutos**.`)
          .setTimestamp();
        await channel.send({ embeds: [embed] });

        const { closeTicket } = require('../ticket/ticketManager');
        await closeTicket(channel, client.user, client);
      } catch (e) {
        console.error('[AUTO-CLOSE]', e.message);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
};
