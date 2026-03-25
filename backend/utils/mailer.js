const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('./logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? {
        user: env.smtp.user,
        pass: env.smtp.password,
      } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  if (!env.smtp.host || !to) {
    logger.info('Skipping email send; SMTP not configured', { to, subject });
    return;
  }

  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };
