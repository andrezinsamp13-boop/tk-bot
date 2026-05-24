module.exports = {
  async execute(interaction) {
    await interaction.reply({
      content: '⚙️ Sistema configurado!',
      ephemeral: true
    });
  }
};
