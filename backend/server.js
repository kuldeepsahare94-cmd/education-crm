const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { requireAuth } = require('./middleware/auth');

const app = express();

// Universal lead capture — PUBLIC, called cross-origin from arbitrary customer
// websites, so it needs its OWN permissive CORS and must be registered
// BEFORE the restrictive global cors() below — otherwise that global rule
// (locked to FRONTEND_URL) would block every third-party site's browser
// requests before they ever reach this route.
app.use('/api/capture', cors(), express.json(), require('./routes/leadCapture'));

// In production, set FRONTEND_URL to your Vercel URL (e.g. https://your-crm.vercel.app)
// so only your deployed frontend can call this API. Left open (*) if unset, for local dev.
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// WhatsApp webhook receiver — PUBLIC (providers can't send our JWT) and needs
// the raw request body for signature verification, so it's registered here,
// before the global JSON parser below. Route handlers respond directly and
// never call next(), so express.json() never touches these requests.
app.use('/api/whatsapp/webhook', express.raw({ type: '*/*', limit: '2mb' }), require('./routes/whatsappWebhook'));

// Facebook/Instagram Lead Ads webhook — same reasoning as the WhatsApp one:
// public, needs the raw body for Meta's HMAC signature check, must be
// registered before the global JSON parser.
app.use('/api/social-leads', express.raw({ type: '*/*', limit: '1mb' }), require('./routes/leadSourcesSocial'));

app.use(express.json());

// Public routes
app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Everything below requires a valid, active login
app.use('/api/leads', requireAuth, require('./routes/leads'));
app.use('/api/students', requireAuth, require('./routes/students'));
app.use('/api/courses', requireAuth, require('./routes/courses'));
app.use('/api/admissions', requireAuth, require('./routes/admissions'));
app.use('/api/payments', requireAuth, require('./routes/payments'));
app.use('/api/companies', requireAuth, require('./routes/companies'));
app.use('/api/placements', requireAuth, require('./routes/placements'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/api/reports', requireAuth, require('./routes/reports'));
app.use('/api/notifications', requireAuth, require('./routes/notifications'));
app.use('/api/roles', requireAuth, require('./routes/roles'));
app.use('/api/users', requireAuth, require('./routes/users'));
app.use('/api/settings', requireAuth, require('./routes/settings'));
app.use('/api/assistant', requireAuth, require('./routes/assistant'));
app.use('/api/dev', requireAuth, require('./routes/dev'));
app.use('/api/whatsapp', requireAuth, require('./routes/whatsapp'));
app.use('/api/whatsapp', requireAuth, require('./routes/whatsappWorkflows'));
app.use('/api/whatsapp', requireAuth, require('./routes/whatsappCampaigns'));
app.use('/api/whatsapp', requireAuth, require('./routes/whatsappConversations'));
app.use('/api/whatsapp', requireAuth, require('./routes/whatsappAnalytics'));
app.use('/api/lead-sources', require('./routes/leadSourcesFacebookOAuth')); // own per-route auth — /facebook/callback must stay public, so this must be mounted BEFORE the blanket-requireAuth router below
app.use('/api/lead-sources', requireAuth, require('./routes/leadSources'));
app.use('/api/backup', requireAuth, require('./routes/backup'));
app.use('/api/batches', requireAuth, require('./routes/batches'));
app.use('/api/attendance', requireAuth, require('./routes/attendance'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Placement CRM API running on port ${PORT}`));
