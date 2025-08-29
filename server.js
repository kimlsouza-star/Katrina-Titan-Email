const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const {
  SMTP_HOST = 'smtp.titan.email',
  SMTP_PORT = '465',            // use SSL first
  SMTP_SECURE = 'true',         // SSL on 465
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
  API_KEY
} = process.env;

// hard-stop if required envs missing
if (!SMTP_USER || !SMTP_PASS || !FROM_EMAIL || !API_KEY) {
  console.error('Missing required environment vars: SMTP_USER, SMTP_PASS, FROM_EMAIL, API_KEY');
  process.exit(1);
}

// Safety: trim hidden whitespace from env vars
const SMTP_USER_CLEAN = String(SMTP_USER).trim();
const SMTP_PASS_CLEAN = String(SMTP_PASS).trim();
const FROM_EMAIL_CLEAN = String(FROM_EMAIL).trim();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// API key auth
app.use((req, res, next) => {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// Build transporter (authMethod PLAIN + modern TLS)
function makeTransport({ port, secure }) {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(port),
    secure: !!secure,
    auth: { user: SMTP_USER_CLEAN, pass: SMTP_PASS_CLEAN },
    authMethod: 'PLAIN',
    tls: { minVersion: 'TLSv1.2' }
  });
}

// Try primary setting first (465/SSL). If 535, fall back to 587/STARTTLS automatically.
async function sendMailWithFallback(mailOptions) {
  const primary = makeTransport({ port: SMTP_PORT, secure: String(SMTP_SECURE).toLowerCase() === 'true' });
  try {
    return await primary.sendMail(mailOptions);
  } catch (err) {
    // If it’s an auth error (535), try the other common profile
    if (String(err && err.message).includes('535')) {
      const fallback = makeTransport({ port: 587, secure: false });
      return await fallback.sendMail(mailOptions);
    }
    throw err;
  }
}

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, text, html, replyTo } = req.body || {};
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'to, subject, and text or html are required' });
    }

    const info = await sendMailWithFallback({
      from: FROM_EMAIL_CLEAN,  // must match the authenticated mailbox
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
      replyTo: replyTo || undefined
    });

    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email send failed:', err);
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Email relay running on', PORT));
