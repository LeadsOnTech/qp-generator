const jwt = require('jsonwebtoken');

// In production this MUST be set via environment variable — the fallback
// here exists only so local/dev setups don't crash with no .env configured,
// never rely on it for a real deployment.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-in-production';
const TOKEN_EXPIRY = '30d';

function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, instituteId: user.instituteId || null },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * A short-lived token issued right after a correct password, for accounts
 * with 2FA enabled. It can ONLY be redeemed at /api/auth/2fa/verify-login
 * — it carries no role/institute access on its own, so even if it leaked
 * it couldn't be used to reach any protected route.
 */
function signPendingTwoFactorToken(user) {
  return jwt.sign(
    { userId: user.id, pendingTwoFactor: true },
    JWT_SECRET,
    { expiresIn: '5m' }
  );
}

/**
 * Express middleware: requires a valid Bearer token. Attaches req.user =
 * { userId, role, instituteId } on success. Every protected route uses this.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Not logged in. Please sign in again.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // A pending-2FA token (issued right after a correct password, before
    // the 6-digit code is confirmed) must NEVER be accepted as a real
    // session — it deliberately carries no role/instituteId, and without
    // this check that missing instituteId would make an institute-scoped
    // Prisma query skip filtering entirely (Prisma ignores `undefined`
    // filter values), exposing every institute's data. Reject it outright.
    if (payload.pendingTwoFactor) {
      return res.status(401).json({ error: 'Two-factor verification is not complete for this login.' });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

/**
 * Express middleware: requires the authenticated user to be an ADMIN.
 * Use requireAuth first, then this, on routes only the platform owner
 * should reach (Syllabus Master edits, Quality Checks, master bank
 * management, viewing/managing other institutes, etc.)
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'This action is restricted to platform administrators.' });
  }
  next();
}

/**
 * Builds a Prisma "where" scoping clause for institute-owned data.
 * ADMIN sees everything (empty filter); INSTITUTE users are restricted
 * to rows matching their own instituteId.
 */
function scopeToInstitute(req, field = 'instituteId') {
  if (req.user.role === 'ADMIN') return {};
  return { [field]: req.user.instituteId };
}

module.exports = { signToken, signPendingTwoFactorToken, requireAuth, requireAdmin, scopeToInstitute, JWT_SECRET };
