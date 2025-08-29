const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const {
  SMTP_HOST = 'smtp.titan.email',
  SMTP_PORT = '587',          // 587 = STARTTLS, 465 = SSL
  SMTP_SECURE = 'false',      // "false" for 587, "true" for 465
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
  API_KEY
} = process.env;

// stop if missing critical env vars
if (!SMTP_USER || !SMTP_PASS || !FROM_EMAIL || !API_KEY) {
  console.error('Missing required environment vars: SMTP_USER, SMTP_PASS, FROM_EMAIL, API_KEY');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// API key auth
app.use((req, res, next) => {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// configure transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: String(SMTP_SECURE).toLowerCase() === 'true', // true = 465 (implicit SSL)
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  // require STARTTLS when not using implicit SSL
  requireTLS: String(SMTP_SECURE).toLowerCase() !== 'true'
});

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, text, html, replyTo } = req.body || {};
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'to, subject, and text or html are required' });
    }

    const info = await transporter.sendMail({
      from: FROM_EMAIL,   // must be the authenticated mailbox on Titan
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
      replyTo: replyTo || undefined
    });

    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email send failed:', err);
    // return the real SMTP error so we can diagnose quickly
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// simple health check
app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Email relay running on', PORT));
