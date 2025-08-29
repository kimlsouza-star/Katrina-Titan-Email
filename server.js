const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const helmet = require('helmet');                 // NEW
const rateLimit = require('express-rate-limit');  // NEW

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
app.use(helmet()); // security headers
app.use(express.json({ limit: '2mb' }));

// global rate limit: 100 requests per 10 minutes per IP
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// tightened CORS (only VF + your site allowed)
const allowed = [
  'https://creator.voiceflow.com',
  'https://general-runtime.voiceflow.com',
  'https://healthy4information.com'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  }
}));

// auth middleware
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

// hide root (don’t advertise)
app.get('/', (_req, res) => res.status(404).end());

// log requests
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.path}`);
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Email relay running on', PORT));
