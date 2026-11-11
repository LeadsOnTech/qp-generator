const path = require('path');
const fs = require('fs');

// Ensure .env is loaded from backend directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Resolve absolute path to SQLite dev.db so it works regardless of working directory
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:.')) {
  const dbPath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, '/')}`;
}

// Ensure JWT secret is configured; warn if falling back in non-production
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[SECURITY WARNING] JWT_SECRET is not set in environment! Setting up fallback.');
  }
  process.env.JWT_SECRET = 'qp-generator-prod-jwt-secret-key-2026';
}

if (!process.env.GEMINI_API_KEY) {
  console.warn('[CONFIG] GEMINI_API_KEY is not set. AI question generation will run in rule-based mode.');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const uploadRoutes = require('./routes/upload');
const questionRoutes = require('./routes/questions');
const syllabusRoutes = require('./routes/syllabus');
const taggingRoutes = require('./routes/tagging');
const duplicateRoutes = require('./routes/duplicates');
const paperRoutes = require('./routes/papers');
const checkRoutes = require('./routes/checks');
const imageRoutes = require('./routes/images');
const examRoutes = require('./routes/exams');
const instituteRoutes = require('./routes/institutes');
const rechargeRoutes = require('./routes/recharge');
const authRoutes = require('./routes/auth');
const cbtRoutes = require('./routes/cbt');
const resultRoutes = require('./routes/results');
const publicResultRoutes = require('./routes/publicResults');
const publicCollegesRoutes = require('./routes/publicColleges');
const collegeCmsRoutes = require('./routes/collegeCms');
const superAdminWebsitesRoutes = require('./routes/superAdminWebsites');
const subscriptionRoutes = require('./routes/subscriptions');
const subscriptionPaymentRoutes = require('./routes/subscriptionPayment');
const marketplaceRoutes = require('./routes/marketplace');
const { requireAuth, requireAdmin } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust reverse proxy (Traefik / Coolify) for accurate client IP identification
app.set('trust proxy', 1);

// Security Headers: X-Content-Type-Options, X-Frame-Options, HSTS, etc.
app.use(helmet({
  contentSecurityPolicy: false, // Allows KaTeX inline formulas, SVG math rendering, and PDF previews
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration: Whitelist authorized frontend origins
const allowedOrigins = [
  'https://questionstudio.in',
  'https://www.questionstudio.in',
  'http://localhost:5173',
  'http://localhost:4000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4000',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, or same-origin server requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.questionstudio.in')) {
      return callback(null, true);
    }
    return callback(new Error('CORS request blocked: unauthorized origin'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Rate Limiting: Protect authentication routes against brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 authentication attempts per 15 minutes per IP
  message: { error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API Rate Limiting (500 requests per 15 mins per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/signup', authLimiter);

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({
  ok: true,
  version: 'marketplace-phase2b-v1.0.1',
  phase: 'Phase 2B — Super Admin Command Centre & College Seller Studio',
  aiMode: process.env.ANTHROPIC_API_KEY ? 'CLAUDE' : 'RULE_BASED',
}));

// Public / Hybrid routes — student exam portal & public auth
app.use('/api/auth', authRoutes);
app.use('/api/cbt', cbtRoutes);
app.use('/api/public/results', publicResultRoutes);
app.use('/api/public/colleges', publicCollegesRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Razorpay Webhooks (public server-to-server callback verified via HMAC signature)
app.use('/api/subscriptions/payment', (req, res, next) => {
  if (req.path === '/webhook') {
    return subscriptionPaymentRoutes(req, res, next);
  }
  next();
});

// Everything below this line requires a logged-in user (Admin or Institute)
app.use('/api', requireAuth);

// Admin-only bank curation and syllabus management
app.use('/api/upload', requireAdmin, uploadRoutes);
app.use('/api/tagging', requireAdmin, taggingRoutes);
app.use('/api/duplicates', requireAdmin, duplicateRoutes);
app.use('/api/checks', requireAdmin, checkRoutes);
app.use('/api/admin/college-websites', requireAdmin, superAdminWebsitesRoutes);

// Logged-in (Admin or Institute) — routes internally scope data by institute
app.use('/api/questions', questionRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/recharge', rechargeRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/college-cms', collegeCmsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscriptions/payment', subscriptionPaymentRoutes);

// Serve compiled frontend in production
const candidatePaths = [
  path.join(__dirname, '..', '..', 'frontend', 'dist'),
  path.join(__dirname, '..', 'public'),
  path.join(process.cwd(), '..', 'frontend', 'dist'),
];
const frontendDist = candidatePaths.find((p) => fs.existsSync(p));
if (frontendDist) {
  console.log(`Serving frontend static files from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Fallback error handler — log error and return safe error message
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS request blocked')) {
    return res.status(403).json({ error: 'Access denied: origin not allowed by CORS security policy.' });
  }
  console.error('[SERVER ERROR]', err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({ error: isProd ? 'Internal server error.' : (err.message || 'Something went wrong on the server.') });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Question Bank API (Phase 4 — Quality Checks) running on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
});
