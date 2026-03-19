const axios = require('axios');
const env = require('../../config/env');

async function sendTelegramAlert(message) {
  if (!env.telegramBotToken || !env.telegramChatId) {
    return;
  }

  await axios.post(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
    chat_id: env.telegramChatId,
    text: message,
  }, { timeout: 5000 });
}

module.exports = { sendTelegramAlert };
