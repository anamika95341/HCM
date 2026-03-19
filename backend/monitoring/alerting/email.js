const env = require('../../config/env');
const { sendMail } = require('../../utils/mailer');

async function sendDailyDigest({ date, summaryHtml }) {
  if (!env.alertEmailTo) {
    return;
  }
  await sendMail({
    to: env.alertEmailTo,
    subject: `Daily Report — Citizen Portal — ${date}`,
    html: summaryHtml,
    text: summaryHtml.replace(/<[^>]+>/g, ' '),
  });
}

module.exports = { sendDailyDigest };
