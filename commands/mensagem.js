module.exports = {
  async execute(interaction) {
    await interaction.reply({
      content: '💬 Sistema de mensagens funcionando!',
      ephemeral: true
    });
  }
};
