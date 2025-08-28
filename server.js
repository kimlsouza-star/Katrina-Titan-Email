const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const {
  SMTP_HOST = 'smtp.titan.email',
  SMTP_PORT = '587',
  SMTP_SECURE = 'false',
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
  API_KEY
} = process.env;

if (!SMTP_USER || !SMTP_PASS || !FROM_EMAIL || !API_KEY) {
  console.error('Missing required environment vars: SMTP_USER, SMTP_PASS, FROM_EMAIL, API_KEY');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// simple auth middleware
app.use((req, res, next) => {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === 'true',
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, text, html, replyTo } = req.body || {};
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'to, subject, and text or html are required' });
    }

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
      replyTo: replyTo || undefined
    });

    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email send failed:', err);
    return res.status(500).json({ ok: false, error: 'SEND_FAILED' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Email relay running on', PORT));
