'use strict';

module.exports = {
  OWNER_ID: process.env.OWNER_ID || '',

  STATUS_LIST: [
    { name: '🎫 Gerenciando Tickets', type: 'WATCHING' },
    { name: '⚡ TK BOT ONLINE', type: 'PLAYING' },
    { name: '🛠️ Suporte Automático', type: 'WATCHING' },
  ],

  DEFAULT_CONFIG: {
    logChannelId: null,
    staffRoleIds: [],
    ticketCategoryId: null,
    bannerUrl: null,
    embedCor: 0xE74C3C,
    embedDescricao: '**Bem-vindo ao suporte!**\n\nSelecione uma categoria abaixo para abrir um ticket.\nNossa equipe está pronta para atendê-lo.',
    mensagemAutomatica: 'Olá {usuario}! 👋\n\nSeu ticket foi aberto com sucesso.\nAguarde, nossa equipe irá atendê-lo em breve.',
    autoTranscript: false,
    lockStaff: true,
    autoClose: { enabled: false, minutos: 60 },
    cooldown: { enabled: true, segundos: 300 },
    botoes: [
      {
        id: 'atendimento',
        label: 'Atendimento',
        emoji: '🎫',
        cor: 'Danger',
        enabled: true,
        categoriaId: null,
        staffRoleIds: [],
        mensagem: 'Seu ticket de **Atendimento** foi aberto!\nDescreva seu problema e nossa equipe irá atendê-lo em breve.',
        allowCopy: false,
        mencionarCargos: false,
      },
      {
        id: 'vagas',
        label: 'Vagas Staff',
        emoji: '👥',
        cor: 'Primary',
        enabled: true,
        categoriaId: null,
        staffRoleIds: [],
        mensagem: 'Seu ticket de **Vagas Staff** foi aberto!\nAguarde um recrutador para iniciar sua entrevista.',
        allowCopy: false,
        mencionarCargos: false,
      },
      {
        id: 'divulgador',
        label: 'Divulgador',
        emoji: '📢',
        cor: 'Secondary',
        enabled: true,
        categoriaId: null,
        staffRoleIds: [],
        mensagem: 'Seu ticket de **Divulgador** foi aberto!\nCole aqui os dados do seu servidor para análise.',
        allowCopy: false,
        mencionarCargos: false,
      },
    ],
  },

  PRIORITY_LABELS: {
    normal: { label: '🟢 Normal', color: 0x2ECC71 },
    medio: { label: '🟡 Médio', color: 0xF1C40F },
    alto: { label: '🔴 Alto', color: 0xE74C3C },
    urgente: { label: '🚨 Urgente', color: 0xFF0000 },
  },

  BUTTON_COLORS: {
    Danger: 4,
    Primary: 1,
    Secondary: 2,
    Success: 3,
  },
};
