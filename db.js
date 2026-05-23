'use strict';
const fs = require('fs');
const path = require('path');
const { DEFAULT_CONFIG } = require('../config/config');

const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

// ─── CONFIG ────────────────────────────────────────────────────────────────
function getConfig() {
  const saved = readJSON('config.json');
  if (!saved) {
    writeJSON('config.json', DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  // Merge botoes defaults if missing
  const base = { ...DEFAULT_CONFIG, ...saved };
  if (!Array.isArray(base.botoes) || base.botoes.length === 0) {
    base.botoes = DEFAULT_CONFIG.botoes;
  }
  return base;
}

function saveConfig(data) {
  writeJSON('config.json', data);
}

// ─── TICKETS ───────────────────────────────────────────────────────────────
function getTickets() {
  const saved = readJSON('tickets.json');
  if (!saved) {
    const def = { tickets: [], cooldowns: {}, ticketCount: 0 };
    writeJSON('tickets.json', def);
    return def;
  }
  return saved;
}

function saveTickets(data) {
  writeJSON('tickets.json', data);
}

function getTicketByChannel(channelId) {
  const db = getTickets();
  return db.tickets.find(t => t.channelId === channelId) || null;
}

function getOpenTicketByUser(userId, buttonId) {
  const db = getTickets();
  return db.tickets.find(t => t.userId === userId && t.buttonId === buttonId && t.status === 'open') || null;
}

function createTicket(data) {
  const db = getTickets();
  db.ticketCount = (db.ticketCount || 0) + 1;
  const ticket = {
    id: db.ticketCount,
    channelId: data.channelId,
    userId: data.userId,
    guildId: data.guildId,
    buttonId: data.buttonId,
    assumedBy: null,
    status: 'open',
    priority: 'normal',
    openedAt: new Date().toISOString(),
    closedAt: null,
    closedBy: null,
    lastActivity: new Date().toISOString(),
    messages: [],
    rating: null,
  };
  db.tickets.push(ticket);
  saveTickets(db);
  return ticket;
}

function updateTicket(channelId, updates) {
  const db = getTickets();
  const idx = db.tickets.findIndex(t => t.channelId === channelId);
  if (idx === -1) return null;
  db.tickets[idx] = { ...db.tickets[idx], ...updates };
  saveTickets(db);
  return db.tickets[idx];
}

function addMessageToTicket(channelId, msg) {
  const db = getTickets();
  const idx = db.tickets.findIndex(t => t.channelId === channelId);
  if (idx === -1) return;
  if (!db.tickets[idx].messages) db.tickets[idx].messages = [];
  db.tickets[idx].messages.push(msg);
  db.tickets[idx].lastActivity = new Date().toISOString();
  saveTickets(db);
}

// ─── COOLDOWNS ──────────────────────────────────────────────────────────────
function getCooldown(userId) {
  const db = getTickets();
  return db.cooldowns[userId] || null;
}

function setCooldown(userId, timestamp) {
  const db = getTickets();
  db.cooldowns[userId] = timestamp;
  saveTickets(db);
}

// ─── RESPOSTAS ─────────────────────────────────────────────────────────────
function getRespostas() {
  const saved = readJSON('respostas.json');
  if (!saved) {
    const def = { respostas: {}, blacklist: [], floodControl: {} };
    writeJSON('respostas.json', def);
    return def;
  }
  return saved;
}

function saveRespostas(data) {
  writeJSON('respostas.json', data);
}

// ─── AVALIACOES ─────────────────────────────────────────────────────────────
function getAvaliacoes() {
  const saved = readJSON('avaliacoes.json');
  if (!saved) {
    const def = { avaliacoes: [] };
    writeJSON('avaliacoes.json', def);
    return def;
  }
  return saved;
}

function saveAvaliacao(data) {
  const db = getAvaliacoes();
  db.avaliacoes.push({ ...data, timestamp: new Date().toISOString() });
  writeJSON('avaliacoes.json', db);
}

module.exports = {
  getConfig, saveConfig,
  getTickets, saveTickets, getTicketByChannel, getOpenTicketByUser,
  createTicket, updateTicket, addMessageToTicket,
  getCooldown, setCooldown,
  getRespostas, saveRespostas,
  getAvaliacoes, saveAvaliacao,
};
