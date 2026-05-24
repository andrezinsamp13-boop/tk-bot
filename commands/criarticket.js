module.exports = {
  async execute(interaction) {
    await interaction.reply({
      content: '✅ Painel de ticket criado!',
      ephemeral: true
    });
  }
};
