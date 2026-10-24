require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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
const { requireAuth, requireAdmin } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({
  ok: true,
  phase: 'Phase 5 — Authentication & Institute Accounts',
  aiMode: process.env.ANTHROPIC_API_KEY ? 'CLAUDE' : 'RULE_BASED',
}));

// Public — no login required
app.use('/api/auth', authRoutes);

// Everything below this line requires a logged-in user (Admin or Institute)
app.use('/api', requireAuth);

// Admin-only bank curation and syllabus management
app.use('/api/upload', requireAdmin, uploadRoutes);
app.use('/api/tagging', requireAdmin, taggingRoutes);
app.use('/api/duplicates', requireAdmin, duplicateRoutes);
app.use('/api/checks', requireAdmin, checkRoutes);

// Logged-in (Admin or Institute) — routes internally scope data by institute
app.use('/api/questions', questionRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/recharge', rechargeRoutes);

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

// Fallback error handler — never leak a raw stack trace to the client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Question Bank API (Phase 4 — Quality Checks) running on http://localhost:${PORT}`);
});
