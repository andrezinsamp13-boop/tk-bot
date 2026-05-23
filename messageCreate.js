'use strict';
const db = require('../database/db');

const floodTracker = new Map(); // userId -> { count, resetAt }
const FLOOD_LIMIT = 5;
const FLOOD_WINDOW = 10000; // 10s
const COOLDOWN_RESP = 3000; // 3s between responses

module.exports = async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const respData = db.getRespostas();
  const respostas = respData.respostas || {};
  const blacklist = respData.blacklist || [];

  const content = message.content.toLowerCase().trim();

  // Anti-flood
  const now = Date.now();
  const flood = floodTracker.get(message.author.id) || { count: 0, resetAt: now + FLOOD_WINDOW };
  if (now > flood.resetAt) {
    flood.count = 0;
    flood.resetAt = now + FLOOD_WINDOW;
  }
  flood.count++;
  floodTracker.set(message.author.id, flood);
  if (flood.count > FLOOD_LIMIT) return;

  // Cooldown per user
  const floodData = respData.floodControl || {};
  const lastResp = floodData[message.author.id] || 0;
  if (now - lastResp < COOLDOWN_RESP) return;

  // Check blacklist
  for (const word of blacklist) {
    if (content.includes(word.toLowerCase())) return;
  }

  // Check for matching auto-response
  for (const [palavra, resposta] of Object.entries(respostas)) {
    if (content.includes(palavra.toLowerCase())) {
      try {
        const finalResposta = resposta.replace(/@usuário/gi, `${message.author}`).replace(/@usuario/gi, `${message.author}`);
        await message.reply(finalResposta);

        // Save cooldown
        respData.floodControl = respData.floodControl || {};
        respData.floodControl[message.author.id] = now;
        db.saveRespostas(respData);

        // Track message in ticket
        db.addMessageToTicket(message.channelId, {
          time: new Date().toLocaleString('pt-BR'),
          author: message.author.tag,
          content: message.content,
        });
      } catch {}
      return;
    }
  }

  // Track message in ticket channel
  const ticket = db.getTicketByChannel(message.channelId);
  if (ticket && ticket.status === 'open') {
    db.addMessageToTicket(message.channelId, {
      time: new Date().toLocaleString('pt-BR'),
      author: message.author.tag,
      content: message.content,
    });
  }
};
