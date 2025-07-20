// utils/sendAlert.js
const { Resend } = require('resend');
require('dotenv').config();

const domain = 'e-visiton.com';

const FROM_ADDRESSES = {
  security: `"E-Visiton Security" <no-reply@${domain}>`,
};

const createBrandedEmail = ({ subject, message, ip, route }) => {
  const brandColor = "#EA850C";
  const accentColor = "#2A5CAA";
  const year = new Date().getFullYear();
  const logoUrl = 'https://api.e-visiton.com/e-visiton-white.png';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Security Alert</title>
    <style>
      body { font-family: 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #F8FAFC; color: #333; }
      .container { max-width: 600px; margin: auto; background: #fff; }
      .header { background: ${brandColor}; padding: 20px; text-align: center; }
      .logo { height: 40px; }
      .content { padding: 30px 40px; }
      .footer { background: #F1F5F9; text-align: center; font-size: 12px; padding: 20px; color: #64748B; }
      h2 { color: ${brandColor}; margin-top: 0; }
      .code-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; margin-top: 20px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; }
      a { color: ${accentColor}; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="${logoUrl}" alt="E-Visiton" class="logo" />
      </div>
      <div class="content">
        <h2>${subject || '🚨 Security Alert from E-Visiton'}</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Route:</strong> ${route || 'Unknown'}</p>
        <p><strong>IP:</strong> ${ip || 'Unknown'}</p>
        <div class="code-box">${message}</div>
      </div>
      <div class="footer">
        <p>© ${year} E-Visit. All rights reserved.</p>
        <p>Kaçanik, Kosovo | <a href="https://e-visiton.com">Visit Website</a></p>
        <p style="margin-top: 10px;">
          <a href="https://facebook.com/e.visiton" style="margin: 0 5px;">Facebook</a> | 
          <a href="https://instagram.com/e.visiton" style="margin: 0 5px;">Instagram</a>
        </p>
      </div>
    </div>
  </body>
  </html>
  `;
};

const resend = new Resend(process.env.RESEND_API_KEY);

const sendSecurityAlert = async ({ subject, message, ip, route }) => {
  try {
    const html = createBrandedEmail({ subject, message, ip, route });

    await resend.emails.send({
      from: FROM_ADDRESSES.security,
      to: process.env.ALERT_EMAIL,
      subject: subject || '🚨 Security Alert from E-Visiton',
      html,
    });

    console.log('✅ Security alert email sent.');
  } catch (error) {
    console.error('❌ Failed to send alert email:', error);
  }
};

module.exports = sendSecurityAlert;
