'use strict';
const { AttachmentBuilder } = require('discord.js');

async function generateTranscript(ticket, channel) {
  const lines = [];
  lines.push(`═══════════════════════════════════════════`);
  lines.push(`TK BOT — TRANSCRIPT DE TICKET`);
  lines.push(`═══════════════════════════════════════════`);
  lines.push(`Ticket ID : #${String(ticket.id).padStart(4, '0')}`);
  lines.push(`Canal     : ${channel.name}`);
  lines.push(`Tipo      : ${ticket.buttonId || 'N/A'}`);
  lines.push(`Usuário   : ${ticket.userId}`);
  lines.push(`Aberto em : ${new Date(ticket.openedAt).toLocaleString('pt-BR')}`);
  if (ticket.closedAt) lines.push(`Fechado em: ${new Date(ticket.closedAt).toLocaleString('pt-BR')}`);
  if (ticket.assumedBy) lines.push(`Assumido  : ${ticket.assumedBy}`);
  lines.push(`═══════════════════════════════════════════`);
  lines.push('');

  if (ticket.messages && ticket.messages.length > 0) {
    for (const msg of ticket.messages) {
      lines.push(`[${msg.time}] ${msg.author}:`);
      lines.push(`  ${msg.content}`);
      lines.push('');
    }
  } else {
    // Fetch messages from channel
    try {
      const fetched = await channel.messages.fetch({ limit: 100 });
      const sorted = [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      for (const msg of sorted) {
        if (msg.author.bot && msg.embeds.length > 0 && !msg.content) continue;
        const time = msg.createdAt.toLocaleString('pt-BR');
        const author = `${msg.author.tag}`;
        const content = msg.content || (msg.embeds.length > 0 ? '[Embed]' : '[Sem conteúdo]');
        lines.push(`[${time}] ${author}:`);
        lines.push(`  ${content}`);
        if (msg.attachments.size > 0) {
          msg.attachments.forEach(a => lines.push(`  [Anexo: ${a.url}]`));
        }
        lines.push('');
      }
    } catch {}
  }

  lines.push(`═══════════════════════════════════════════`);
  lines.push(`Gerado por TK BOT em ${new Date().toLocaleString('pt-BR')}`);

  const buffer = Buffer.from(lines.join('\n'), 'utf8');
  return new AttachmentBuilder(buffer, { name: `transcript-ticket-${ticket.id}.txt` });
}

module.exports = { generateTranscript };
