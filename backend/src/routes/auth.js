const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const prisma = require('../db');
const { signToken, signPendingTwoFactorToken, requireAuth, JWT_SECRET } = require('../lib/auth');
const { hasEmailConfigured, sendPasswordResetEmail } = require('../lib/email');

const router = express.Router();

router.post('/register/reject-access/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can reject requests.' });
  try {
    await prisma.registrationRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});


router.get('/register/requests', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can view requests.' });
  try {
    const requests = await prisma.registrationRequest.findMany({
      
      orderBy: { createdAt: 'asc' }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});


router.post('/register/approve-access/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can approve requests.' });
  
  const request = await prisma.registrationRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request is already ' + request.status });

  // Generate random password
  const rawPassword = crypto.randomBytes(6).toString('hex'); // 12 chars
  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const WELCOME_CREDITS = 200;

  try {
    let slug = slugify(request.instituteName);
    const existingSlug = await prisma.institute.findUnique({ where: { slug } });
    if (existingSlug) slug = slug + "-" + Date.now().toString(36);

    const result = await prisma.$transaction(async (tx) => {
      await tx.registrationRequest.update({ where: { id: request.id }, data: { status: 'APPROVED' } });
      
      const inst = await tx.institute.create({
        data: { name: request.instituteName, slug, phone: request.phone, creditBalance: WELCOME_CREDITS }
      });
      const usr = await tx.user.create({
        data: { email: request.email, passwordHash, role: 'INSTITUTE', instituteId: inst.id }
      });
      await tx.creditTransaction.create({
        data: { instituteId: inst.id, amount: WELCOME_CREDITS, reason: 'New account welcome credits (Admin Approved)', balanceAfter: WELCOME_CREDITS }
      });
      return { user: usr, institute: inst };
    });

    const loginMsg = `Your QuestionStudio account is approved!\n\nLogin: http://localhost:5173/#/login\nEmail: ${request.email}\nPassword: ${rawPassword}\n\n🎁 200 Free Credits have been added.`;
    whatsapp.sendWelcomeMessage(request.phone, 200, "http://localhost:5173/#/login").catch(() => {});
    // In production, use whatsapp provider to send the actual password securely

    res.json({ success: true, message: 'Account created, credits added, and login details generated.', credentials: { email: request.email, password: rawPassword } });
  } catch (err) {
    console.error('Failed to approve request:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


const multer = require('multer');
const path = require('path');
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'cards');
if (!require('fs').existsSync(UPLOAD_DIR)) {
  require('fs').mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    cb(null, `card-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`);
  },
});
const upload = multer({ storage });

router.post('/register/request-access', upload.single('businessCard'), async (req, res) => {
  const { fullName, phone, email, instituteName, userType, gbpLink } = req.body;
  
  if (!fullName || !phone || !email || !instituteName || !userType) {
    return res.status(400).json({ error: 'Please fill all required fields.' });
  }

  // Check if phone or email already requested
  const existingReq = await prisma.registrationRequest.findFirst({ where: { OR: [{ phone }, { email: email.toLowerCase() }] } });
  if (existingReq) {
    return res.status(409).json({ error: 'A request with this phone or email already exists. Please wait for our team to verify.' });
  }

  // Check if already user
  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    return res.status(409).json({ error: 'This email is already registered.' });
  }

  const businessCardUrl = req.file ? `/uploads/cards/${req.file.filename}` : null;

  try {
    const request = await prisma.registrationRequest.create({
      data: {
        fullName,
        phone,
        email: email.toLowerCase(),
        instituteName: userType === 'TEACHER' ? fullName : instituteName,
        userType,
        gbpLink: gbpLink || null,
        businessCardUrl
      }
    });
    res.json({ success: true, message: 'Request submitted successfully.' });
  } catch (err) {
    console.error('Failed to submit registration request:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


const whatsapp = require('../lib/whatsapp');

/**
 * POST /api/auth/register/otp/request
 * Request an OTP for WhatsApp registration.
 */
router.post('/register/otp/request', async (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string' || phone.length < 5) {
    return res.status(400).json({ error: 'Valid WhatsApp number is required.' });
  }

  // Check if existing
  const existingInstitute = await prisma.institute.findFirst({ where: { phone } });
  if (existingInstitute) {
    return res.status(409).json({ error: 'This WhatsApp number is already registered. Please sign in.' });
  }

  // Check rate limit / active OTPs (basic)
  const recent = await prisma.whatsAppVerification.findFirst({
    where: { phone, createdAt: { gte: new Date(Date.now() - 60000) } }
  });
  if (recent) {
    return res.status(429).json({ error: 'Please wait a minute before requesting another code.' });
  }

  const otp = whatsapp.generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

  // Upsert verification record
  await prisma.whatsAppVerification.upsert({
    where: { phone },
    update: { otp, expiresAt, verified: false, attempts: 0 },
    create: { phone, otp, expiresAt, verified: false, attempts: 0 }
  });

  try {
    await whatsapp.sendOtp(phone, otp);
    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Failed to send OTP:', err);
    res.status(500).json({ error: 'Unable to send the verification code. Please try again.' });
  }
});

/**
 * POST /api/auth/register/otp/verify
 * Verify OTP and create the account with 200 free credits in a transaction.
 */
router.post('/register/otp/verify', async (req, res) => {
  const { phone, otp, fullName, instituteName, email, password, role } = req.body;

  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required.' });
  if (!instituteName || !email || !password || password.length < 8) {
    return res.status(400).json({ error: 'All registration fields (including a min 8-char password) are required.' });
  }

  // 1. Verify OTP
  const verification = await prisma.whatsAppVerification.findUnique({ where: { phone } });
  if (!verification) {
    return res.status(404).json({ error: 'No pending verification found for this number.' });
  }
  if (verification.attempts >= 5) {
    return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
  }
  if (verification.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Your verification code has expired. Request a new code.' });
  }
  if (verification.otp !== otp) {
    await prisma.whatsAppVerification.update({ where: { phone }, data: { attempts: { increment: 1 } } });
    return res.status(400).json({ error: 'That verification code is incorrect.' });
  }

  // 2. Validate user uniqueness
  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists. Try logging in instead.' });
  }
  const existingPhone = await prisma.institute.findFirst({ where: { phone } });
  if (existingPhone) {
    return res.status(409).json({ error: 'This WhatsApp number is already registered. Please sign in.' });
  }

  // 3. Atomically create account & credits
  try {
    let slug = slugify(instituteName);
    const existingSlug = await prisma.institute.findUnique({ where: { slug } });
    if (existingSlug) slug = slug + "-" + Date.now().toString(36);

    const passwordHash = await bcrypt.hash(password, 10);
    const WELCOME_CREDITS = 200;

    const result = await prisma.$transaction(async (tx) => {
      // Mark as verified
      await tx.whatsAppVerification.update({
        where: { phone },
        data: { verified: true, otp: '' }
      });

      // Create Institute
      const inst = await tx.institute.create({
        data: { 
          name: instituteName.trim(), 
          slug,
          phone,
          creditBalance: WELCOME_CREDITS
        },
      });

      // Create User
      const usr = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: 'INSTITUTE',
          instituteId: inst.id,
        },
      });

      // Create Credit Transaction
      await tx.creditTransaction.create({
        data: {
          instituteId: inst.id,
          amount: WELCOME_CREDITS,
          reason: 'New account welcome credits (WhatsApp verified)',
          balanceAfter: WELCOME_CREDITS
        }
      });

      return { user: usr, institute: inst };
    });

    // 4. Send Welcome WhatsApp
    const loginUrl = 'http://localhost:5173/#/login';
    whatsapp.sendWelcomeMessage(phone, 200, loginUrl).catch(err => {
      console.error('Non-fatal: failed to send welcome WhatsApp message:', err);
    });

    // 5. Authenticate
    const token = signToken(result.user);
    res.json({ token, user: formatUserResponse(result.user, result.institute), creditsAdded: 200 });

  } catch (err) {
    console.error('Transaction failed:', err);
    res.status(500).json({ error: 'Your account was created, but we could not complete the welcome credit allocation. Please contact support.' });
  }
});


function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatUserResponse(user, institute) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    instituteId: user.instituteId,
    instituteName: institute?.name || null,
    creditBalance: institute?.creditBalance ?? null,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

/**
 * POST /api/auth/signup
 * Institute self-registration. Body: { instituteName, email, password }
 */
router.post('/signup', async (req, res) => {
  const { instituteName, email, password } = req.body;

  if (!instituteName || !instituteName.trim()) {
    return res.status(400).json({ error: 'Institute name is required.' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists. Try logging in instead.' });
  }

  let slug = slugify(instituteName);
  const existingSlug = await prisma.institute.findUnique({ where: { slug } });
  if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

  const passwordHash = await bcrypt.hash(password, 10);

  const institute = await prisma.institute.create({
    data: { name: instituteName.trim(), slug },
  });

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      role: 'INSTITUTE',
      instituteId: institute.id,
    },
  });

  const token = signToken(user);
  res.json({ token, user: formatUserResponse(user, institute) });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * If the account does NOT have 2FA enabled, this returns a full session
 * token immediately, same as before.
 *
 * If 2FA IS enabled, this returns { requiresTwoFactor: true, pendingToken }
 * instead — no session token yet. The frontend must then call
 * POST /api/auth/2fa/verify-login with that pendingToken + the 6-digit
 * code from the user's authenticator app to get the real session token.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { institute: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    if (user.twoFactorEnabled) {
      const pendingToken = signPendingTwoFactorToken(user);
      return res.json({ requiresTwoFactor: true, pendingToken });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = signToken(user);
    res.json({ token, user: formatUserResponse(user, user.institute) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Something went wrong on the server.' });
  }
});

/**
 * POST /api/auth/2fa/verify-login
 * Body: { pendingToken, code }
 * Completes login for a 2FA-enabled account. Redeems the short-lived
 * pending token (issued by /login above) together with the 6-digit code
 * from the authenticator app, and issues the real session token.
 */
router.post('/2fa/verify-login', async (req, res) => {
  const { pendingToken, code } = req.body;
  if (!pendingToken || !code) {
    return res.status(400).json({ error: 'Missing verification code.' });
  }

  let payload;
  try {
    payload = jwt.verify(pendingToken, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'This login attempt has expired. Please sign in again.' });
  }
  if (!payload.pendingTwoFactor) {
    return res.status(400).json({ error: 'Invalid verification request.' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { institute: true } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ error: 'Two-factor authentication is not active on this account.' });
  }

  const validCode = authenticator.verify({ token: code, secret: user.twoFactorSecret });
  if (!validCode) {
    return res.status(401).json({ error: 'Incorrect verification code. Please check your authenticator app and try again.' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = signToken(user);
  res.json({ token, user: formatUserResponse(user, user.institute) });
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: { institute: true } });
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  res.json(formatUserResponse(user, user.institute));
});

/**
 * POST /api/auth/2fa/setup
 * Generates a new TOTP secret + a QR code (as a data URL) for the user to
 * scan with Google Authenticator/Authy. Nothing is saved yet — the secret
 * only becomes active once confirmed via /2fa/enable with a valid code,
 * so a half-finished setup can never lock someone out of their account.
 */
router.post('/2fa/setup', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) return res.status(404).json({ error: 'Account not found.' });

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, 'QuestionStudio', secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  res.json({ secret, qrCodeDataUrl });
});

/**
 * POST /api/auth/2fa/enable
 * Body: { secret, code }
 * Confirms setup: the user must enter a currently-valid 6-digit code
 * generated from the secret shown in /2fa/setup, proving they actually
 * scanned it into a real authenticator app before we turn 2FA on.
 */
router.post('/2fa/enable', requireAuth, async (req, res) => {
  const { secret, code } = req.body;
  if (!secret || !code) {
    return res.status(400).json({ error: 'Missing secret or verification code.' });
  }

  const validCode = authenticator.verify({ token: code, secret });
  if (!validCode) {
    return res.status(400).json({ error: 'That code doesn\'t match. Double-check your authenticator app and try again.' });
  }

  await prisma.user.update({
    where: { id: req.user.userId },
    data: { twoFactorEnabled: true, twoFactorSecret: secret },
  });

  res.json({ ok: true });
});

/**
 * POST /api/auth/2fa/disable
 * Body: { code }
 * Requires a currently-valid code to turn 2FA off — this is deliberate:
 * if 2FA could be disabled with just a password, it would defeat the
 * point of having it at all (anyone who phishes the password could
 * remove the second factor).
 */
router.post('/2fa/disable', requireAuth, async (req, res) => {
  const { code } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ error: 'Two-factor authentication is not currently enabled.' });
  }

  const validCode = authenticator.verify({ token: code, secret: user.twoFactorSecret });
  if (!validCode) {
    return res.status(401).json({ error: 'Incorrect verification code.' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  res.json({ ok: true });
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Always responds with the same generic success message, whether or not
 * that email actually has an account — this deliberately avoids letting
 * someone use this endpoint to check which emails are registered.
 *
 * If SMTP isn't configured yet, the response includes a devResetLink field
 * so the whole flow can be tested today without an email account. Once
 * real SMTP credentials are added to .env, this field stops appearing and
 * a real email is sent instead — no code changes needed for that switch.
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const genericResponse = { ok: true, message: 'If an account exists for that email, a reset link has been sent.' };

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    // Same response either way — don't reveal whether the email exists.
    return res.json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: tokenHash, resetTokenExpiry: expiry },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/#/reset-password?token=${rawToken}`;

  const result = await sendPasswordResetEmail(user.email, resetLink);

  if (!result.sent) {
    // Dev/testing mode only — no SMTP configured yet.
    return res.json({ ...genericResponse, devResetLink: result.devResetLink });
  }

  res.json(genericResponse);
});

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 * Completes a password reset using the token from the emailed link.
 */
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Reset token is missing.' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const tokenHash = hashResetToken(token);
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash },
  });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetTokenHash: null, resetTokenExpiry: null },
  });

  res.json({ ok: true, message: 'Your password has been reset. You can now sign in with your new password.' });
});

module.exports = router;
