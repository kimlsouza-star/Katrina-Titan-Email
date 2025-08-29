const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const {
  SMTP_HOST = 'smtp.titan.email',
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
  API_KEY
} = process.env;

const PORT_SSL = 465;   // SSL
const PORT_TLS = 587;   // STARTTLS

if (!SMTP_USER || !SMTP_PASS || !FROM_EMAIL || !API_KEY) {
  console.error('Missing required environment vars');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Simple auth
app.use((req, res, next) => {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// Make a transporter for SSL or STARTTLS
function makeTransport(port, secure) {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: {
      user: String(SMTP_USER).trim(),  // force full email address
      pass: String(SMTP_PASS).trim()
    },
    authMethod: 'PLAIN',
    tls: { minVersion: 'TLSv1.2' }
  });
}

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, text, html, replyTo } = req.body || {};
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'to, subject, and text or html are required' });
    }

    const mailOptions = {
      from: FROM_EMAIL,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
      replyTo: replyTo || undefined
    };

    // Try SSL first, fallback to STARTTLS if 535 error
    try {
      const info = await makeTransport(PORT_SSL, true).sendMail(mailOptions);
      return res.json({ ok: true, messageId: info.messageId });
    } catch (err) {
      if (String(err.message).includes('535')) {
        const info = await makeTransport(PORT_TLS, false).sendMail(mailOptions);
        return res.json({ ok: true, messageId: info.messageId, note: 'Sent via TLS fallback' });
      }
      throw err;
    }
  } catch (err) {
    console.error('Email send failed:', err);
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Email relay running on', PORT));
