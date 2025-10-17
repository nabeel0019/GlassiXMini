/**
 * Id.js
 * Simple identifier / helper for the bot.
 * Export bot identity info and helper functions.
 */

module.exports = {
  botId: 'GlassiX-Mini',
  ownerName: 'Nabeed',
  getBotSignature() {
    return `${this.botId} — Owner: ${this.ownerName}`;
  },
  timestamp() {
    return new Date().toISOString();
  }
};