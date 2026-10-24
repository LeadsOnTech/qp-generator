const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/auth.js", "utf8");

const newEndpoints = `
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
`;

if (!content.includes("/register/otp/request")) {
  content = content.replace("const router = express.Router();", "const router = express.Router();\n" + newEndpoints);
  fs.writeFileSync("backend/src/routes/auth.js", content, "utf8");
}
