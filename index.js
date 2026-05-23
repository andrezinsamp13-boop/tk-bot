'use strict';

// ─── EXPRESS (manter online / UptimeRobot) ──────────────────────────────
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('TK BOT ONLINE ✅'));
app.get('/health', (req, res) => res.json({ status: 'ok', bot: 'TK BOT', timestamp: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Servidor web ativo na porta ${PORT}`);
});

// ─── ANTI-CRASH ─────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason?.message || reason);
});

// ─── DISCORD CLIENT ──────────────────────────────────────────────────────
const {
  Client,
  GatewayIntentBits,
  Partials,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ─── EVENTS ──────────────────────────────────────────────────────────────
const readyEvent = require('./events/ready');
const interactionCreate = require('./events/interactionCreate');
const messageCreate = require('./events/messageCreate');

client.once('clientReady', () => readyEvent(client));

client.on('interactionCreate', (interaction) => interactionCreate(interaction, client));

client.on('messageCreate', (message) => messageCreate(message));

// Auto-reconnect on disconnect
client.on('shardDisconnect', (event, id) => {
  console.warn(`[SHARD ${id}] Desconectado. Código: ${event.code}`);
});
client.on('shardReconnecting', (id) => {
  console.log(`[SHARD ${id}] Reconectando...`);
});
client.on('shardResume', (id, replayed) => {
  console.log(`[SHARD ${id}] Reconectado! Eventos reprocessados: ${replayed}`);
});

// ─── LOGIN ───────────────────────────────────────────────────────────────
if (!process.env.TOKEN) {
  console.error('❌ TOKEN não encontrado! Configure a variável de ambiente TOKEN.');
  process.exit(1);
}

client.login(process.env.TOKEN).catch((err) => {
  console.error('❌ Falha ao fazer login:', err.message);
  process.exit(1);
});
