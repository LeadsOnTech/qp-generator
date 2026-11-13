const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../db');
const { requireAdmin } = require('../lib/auth');
const { adjustCredits } = require('../lib/credits');
const whatsAppService = require('../lib/whatsapp');

const router = express.Router();

function generateDummyCredentials() {
  const suffix = crypto.randomBytes(3).toString('hex'); // e.g. "a1b2c3"
  const email = `trial-${suffix}@questionstudio.local`;
  // Hex encoding is always alphanumeric (0-9a-f) with no characters to
  // strip, so this reliably gives exactly 10 characters every time —
  // easy enough to type from a WhatsApp message on a phone.
  const password = crypto.randomBytes(5).toString('hex');
  return { email, password };
}

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatInstitute(i) {
  return {
    id: i.id,
    name: i.name,
    slug: i.slug,
    phone: i.phone,
    address: i.address,
    tagline: i.tagline,
    logoFilename: i.logoFilename,
    logoUrl: i.logoFilename ? `/uploads/images/${i.logoFilename}` : null,
    creditBalance: i.creditBalance,
    whatsAppWalletBalance: i.whatsAppWalletBalance ?? 0.0,
    isTrial: i.isTrial,
    trialPhoneNumber: i.trialPhoneNumber,
    rechargeReminderCount: i.rechargeReminderCount ?? 0,
    lastRechargeReminderAt: i.lastRechargeReminderAt ?? null,
    lastRechargeReminderLevel: i.lastRechargeReminderLevel ?? null,
  };
}

/**
 * GET /api/institutes/me
 * An INSTITUTE user's own profile (branding + credit balance). This is
 * the self-service equivalent of GET /:id, scoped automatically to
 * whoever is logged in — no id needs to be passed.
 */
router.get('/me', async (req, res) => {
  if (req.user.role === 'ADMIN') {
    return res.status(400).json({ error: 'Admin accounts are not linked to a single institute. Use GET /api/institutes to list all of them.' });
  }
  const institute = await prisma.institute.findUnique({ where: { id: req.user.instituteId } });
  if (!institute) return res.status(404).json({ error: 'Institute not found.' });
  res.json(formatInstitute(institute));
});

/**
 * PATCH /api/institutes/me — an INSTITUTE user updates their own branding
 */
router.patch('/me', async (req, res) => {
  if (req.user.role === 'ADMIN') {
    return res.status(400).json({ error: 'Admin accounts have no institute profile to update this way.' });
  }
  const allowedFields = ['name', 'phone', 'address', 'tagline', 'logoFilename'];
  const data = {};
  for (const field of allowedFields) {
    if (field in req.body) data[field] = req.body[field] || null;
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided to update.' });
  }
  const institute = await prisma.institute.update({ where: { id: req.user.instituteId }, data });
  res.json({ ok: true, institute: formatInstitute(institute) });
});

/**
 * GET /api/institutes — ADMIN ONLY: list every institute on the platform
 */
router.get('/', requireAdmin, async (req, res) => {
  const institutes = await prisma.institute.findMany({ orderBy: { name: 'asc' } });
  res.json(institutes.map(formatInstitute));
});

/**
 * POST /api/institutes — ADMIN ONLY: manually create an institute profile.
 * (Institutes normally create their own via /api/auth/signup — this route
 * is for admin-managed exceptions, e.g. setting one up before a college
 * has logged in themselves.)
 */
router.post('/', requireAdmin, async (req, res) => {
  const { name, phone, address, tagline, logoFilename, email, password, initialCredits } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Institute name is required.' });
  }

  let slug = slugify(name);
  const existing = await prisma.institute.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const credits = Number(initialCredits);
  const initialBalance = Number.isInteger(credits) && credits > 0 ? credits : 0;

  let userEmail = (email || '').trim().toLowerCase();
  let userPassword = (password || '').trim();

  // If email is provided, check if user already exists
  if (userEmail) {
    const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (existingUser) {
      return res.status(400).json({ error: `A user account with email "${userEmail}" already exists.` });
    }
  }

  const institute = await prisma.institute.create({
    data: {
      name: name.trim(),
      slug,
      phone: phone || null,
      address: address || null,
      tagline: tagline || null,
      logoFilename: logoFilename || null,
      creditBalance: initialBalance,
      trialPassword: userPassword || null,
    },
  });

  // Create login user if email is provided, or if password is provided generate email
  let createdUser = null;
  if (userEmail || userPassword) {
    if (!userEmail) {
      userEmail = `${slugify(name)}@questionstudio.local`;
    }
    if (!userPassword) {
      userPassword = `${slugify(name).slice(0, 6)}@${Math.floor(100 + Math.random() * 900)}`;
    }
    const passwordHash = await bcrypt.hash(userPassword, 10);
    createdUser = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        role: 'INSTITUTE',
        instituteId: institute.id,
      },
    });
    await prisma.institute.update({
      where: { id: institute.id },
      data: { trialPassword: userPassword },
    });
  }

  // Auto-provision College Website record
  try {
    await prisma.collegeWebsite.create({
      data: {
        instituteId: institute.id,
        slug: institute.slug,
        displayName: institute.name,
        mottoTagline: institute.tagline || 'Excellence in Education',
        contactPhone: institute.phone || '',
        campusAddress: institute.address || '',
        aboutTitle: `About ${institute.name}`,
        aboutText: `${institute.name} is dedicated to fostering academic excellence, holistic character, and competitive leadership. Our students consistently excel in state and national examinations.`,
        statsCountersJson: JSON.stringify([
          { label: 'Successful Alumni', value: '10,000+' },
          { label: 'NEET/JEE Selections', value: '2,500+' },
          { label: 'Expert Faculty', value: '50+' },
          { label: 'State Ranks', value: '150+' },
        ]),
      },
    });
  } catch (e) {
    console.error('Failed to auto-create collegeWebsite on institute create:', e);
  }

  res.json({
    id: institute.id,
    name: institute.name,
    slug: institute.slug,
    creditBalance: institute.creditBalance,
    loginEmail: createdUser?.email || null,
    loginPassword: userPassword || null,
  });
});

/**
 * PATCH /api/institutes/:id — ADMIN ONLY: edit any institute's branding
 * (and, uniquely for admin, its credit balance — manual top-ups/corrections)
 */
router.patch('/:id', requireAdmin, async (req, res) => {
  const allowedFields = ['name', 'phone', 'address', 'tagline', 'logoFilename', 'creditBalance'];
  const data = {};
  for (const field of allowedFields) {
    if (field in req.body) data[field] = req.body[field];
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided to update.' });
  }
  try {
    const institute = await prisma.institute.update({ where: { id: req.params.id }, data });
    res.json({ ok: true, institute: formatInstitute(institute) });
  } catch (err) {
    res.status(404).json({ error: 'Institute not found.' });
  }
});

/**
 * DELETE /api/institutes/:id — ADMIN ONLY
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { instituteId: id } }),
      prisma.creditTransaction.deleteMany({ where: { instituteId: id } }),
      prisma.rechargeRequest.deleteMany({ where: { instituteId: id } }),
      prisma.razorpayTransaction.deleteMany({ where: { instituteId: id } }),
      prisma.paper.deleteMany({ where: { instituteId: id } }),
      prisma.question.deleteMany({ where: { ownerInstituteId: id } }),
      prisma.institute.delete({ where: { id } }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete institute: ' + err.message });
  }
});

/**
 * POST /api/institutes/trial
 * ADMIN ONLY — generates a brand-new dummy institute + login for sending
 * to a prospective college via WhatsApp. Pre-loaded with 200 free credits.
 * Body: { instituteName?, phone? }
 *
 * The plain-text password is returned ONLY in this response — it's
 * hashed for storage immediately after, exactly like a real signup, so
 * there is no way to retrieve it again later. Copy it now.
 */
router.post('/trial', requireAdmin, async (req, res) => {
  try {
    const { instituteName, phone } = req.body;
    let { email, password } = generateDummyCredentials();

    // Prevent email collision
    let existingUser = await prisma.user.findUnique({ where: { email } });
    let attempts = 0;
    while (existingUser && attempts < 5) {
      const creds = generateDummyCredentials();
      email = creds.email;
      password = creds.password;
      existingUser = await prisma.user.findUnique({ where: { email } });
      attempts++;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const name = (instituteName && instituteName.trim()) || `Trial Account ${new Date().toLocaleDateString('en-IN')}`;
    let baseSlug = slugify(name);
    if (!baseSlug) baseSlug = 'trial';
    let slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;

    // Prevent slug collision
    let existingSlug = await prisma.institute.findUnique({ where: { slug } });
    let slugAttempts = 0;
    while (existingSlug && slugAttempts < 5) {
      slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
      existingSlug = await prisma.institute.findUnique({ where: { slug } });
      slugAttempts++;
    }

    const institute = await prisma.institute.create({
      data: {
        name,
        slug,
        isTrial: true,
        trialPhoneNumber: phone ? phone.trim() : null,
        trialPassword: password,
        creditBalance: 200,
      },
    });

    await prisma.creditTransaction.create({
      data: { instituteId: institute.id, amount: 200, reason: 'Trial account created', balanceAfter: 200 },
    });

    const user = await prisma.user.create({
      data: { email, passwordHash, role: 'INSTITUTE', instituteId: institute.id },
    });

    res.json({
      instituteId: institute.id,
      instituteName: institute.name,
      email,
      password, // plain text — shown once, never retrievable again
      creditsGranted: 200,
    });
  } catch (err) {
    console.error('[TRIAL CREATE ERROR]', err);
    res.status(500).json({ error: 'Failed to generate trial login: ' + err.message });
  }
});

/**
 * GET /api/institutes/trial/list
 * ADMIN ONLY — every trial account ever generated, with enough info to
 * drive the sales follow-up workflow: which phone number it was sent to,
 * whether it's been logged into yet, and how many credits are left.
 */
router.get('/trial/list', requireAdmin, async (req, res) => {
  try {
    const trials = await prisma.institute.findMany({
      where: { isTrial: true },
      include: { users: { select: { email: true, lastLoginAt: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(trials.map((t) => {
      const user = t.users[0] || null;
      let status = 'Not yet used';
      if (user?.lastLoginAt) {
        status = t.creditBalance <= 0 ? 'Credits exhausted' : 'Active / in use';
      }
      return {
        id: t.id,
        name: t.name,
        phone: t.trialPhoneNumber,
        email: user?.email || null,
        password: t.trialPassword || 'N/A', // Display the stored plaintext password
        creditBalance: t.creditBalance,
        status,
        createdAt: t.createdAt,
        lastLoginAt: user?.lastLoginAt || null,
      };
    }));
  } catch (err) {
    console.error('[TRIAL LIST ERROR]', err);
    res.status(500).json({ error: 'Failed to load trial accounts: ' + err.message });
  }
});

/**
 * PATCH /api/institutes/:id/trial-phone
 * ADMIN ONLY — record/update which phone number a trial login was sent
 * to, after the fact (e.g. if it wasn't set at creation time).
 */
router.patch('/:id/trial-phone', requireAdmin, async (req, res) => {
  const { phone } = req.body;
  try {
    const institute = await prisma.institute.update({
      where: { id: req.params.id },
      data: { trialPhoneNumber: phone || null },
    });
    res.json({ ok: true, institute: formatInstitute(institute) });
  } catch (err) {
    res.status(404).json({ error: 'Institute not found.' });
  }
});

/**
 * POST /api/institutes/:id/credits
 * ADMIN ONLY — manually add (or, with a negative amount, correct/remove)
 * credits for any institute. This is today's stand-in for a real payment
 * gateway: admin confirms a payment happened outside the system (bank
 * transfer, UPI, cash) and records the credit here.
 * Body: { amount, reason }
 */
router.post('/:id/credits', requireAdmin, async (req, res) => {
  const { amount, reason } = req.body;
  const parsedAmount = Number(amount);
  if (!Number.isInteger(parsedAmount) || parsedAmount === 0) {
    return res.status(400).json({ error: 'amount must be a non-zero whole number.' });
  }
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A short reason is required, e.g. "Recharge — Rs 3000 via UPI".' });
  }

  try {
    const { institute, transaction } = await adjustCredits(req.params.id, parsedAmount, reason.trim());
    res.json({ ok: true, institute: formatInstitute(institute), transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/institutes/:id/credit-history
 * Full ledger for one institute — visible to admin for any institute, or
 * to the institute itself for their own account.
 */
router.get('/:id/credit-history', async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.instituteId !== req.params.id) {
    return res.status(403).json({ error: 'You can only view your own institute\'s credit history.' });
  }
  const history = await prisma.creditTransaction.findMany({
    where: { instituteId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(history);
});

/**
 * POST /api/institutes/:id/create-login
 * ADMIN ONLY — create or reset a login account (email + password) for this institute.
 */
router.post('/:id/create-login', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let { email, password } = req.body;

    const institute = await prisma.institute.findUnique({ where: { id } });
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found.' });
    }

    if (!email || !email.trim()) {
      const cleanSlug = institute.slug.replace(/[^a-z0-9]/g, '');
      email = `${cleanSlug}@questionstudio.local`;
    }
    email = email.trim().toLowerCase();

    if (!password || !password.trim()) {
      password = crypto.randomBytes(4).toString('hex');
    }
    password = password.trim();

    const passwordHash = await bcrypt.hash(password, 10);

    let user = await prisma.user.findFirst({
      where: { instituteId: institute.id },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          passwordHash,
          role: 'INSTITUTE',
        },
      });
    } else {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ error: `Email "${email}" is already in use by another user account. Please choose a different email.` });
      }

      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'INSTITUTE',
          instituteId: institute.id,
        },
      });
    }

    await prisma.institute.update({
      where: { id: institute.id },
      data: { trialPassword: password },
    });

    res.json({
      ok: true,
      message: `Login credentials configured for ${institute.name}`,
      email,
      password,
      instituteId: institute.id,
      instituteName: institute.name,
    });
  } catch (err) {
    console.error('Failed to create institute login:', err);
    res.status(500).json({ error: 'Failed to create login: ' + err.message });
  }
});

/**
 * GET /api/institutes/:id/login-info
 * ADMIN ONLY — view login email and status for this institute.
 */
router.get('/:id/login-info', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findFirst({
      where: { instituteId: id },
      select: { email: true, createdAt: true, lastLoginAt: true },
    });
    const institute = await prisma.institute.findUnique({
      where: { id },
      select: { trialPassword: true },
    });

    res.json({
      hasLogin: Boolean(user),
      email: user?.email || null,
      lastLoginAt: user?.lastLoginAt || null,
      savedPassword: institute?.trialPassword || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch login info' });
  }
});

/**
 * POST /api/institutes/:id/send-recharge-reminder
 * ADMIN ONLY — sends WhatsApp recharge reminder (Level 1, 2, or 3) to the college management phone,
 * and increments reminder counters.
 */
router.post('/:id/send-recharge-reminder', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const requestedLevel = req.body.alertLevel ? Number(req.body.alertLevel) : null;

    const institute = await prisma.institute.findUnique({ where: { id } });
    if (!institute) return res.status(404).json({ error: 'Institute not found.' });

    // Determine target phone number
    const targetPhone = institute.phone || institute.trialPhoneNumber;
    if (!targetPhone) {
      return res.status(400).json({ error: 'This institute does not have a registered contact phone number to receive WhatsApp alerts.' });
    }

    // Determine alert level:
    // If explicitly provided (1, 2, or 3), use that.
    // Otherwise, auto-escalate based on previous count: 1 -> 2 -> 3 (max 3, cycles or holds at 3).
    let alertLevel = requestedLevel;
    if (!alertLevel || alertLevel < 1 || alertLevel > 3) {
      const prevLevel = institute.lastRechargeReminderLevel || 0;
      alertLevel = Math.min(prevLevel + 1, 3);
    }

    // Dispatch WhatsApp alert
    const sent = await whatsAppService.sendRechargeReminderAlert({
      collegeName: institute.name,
      phone: targetPhone,
      currentCredits: institute.creditBalance,
      alertLevel,
      rechargeUrl: `${process.env.APP_URL || 'https://questionstudio.in'}/#/recharge`,
    });

    // Update database records
    const updated = await prisma.institute.update({
      where: { id },
      data: {
        rechargeReminderCount: { increment: 1 },
        lastRechargeReminderAt: new Date(),
        lastRechargeReminderLevel: alertLevel,
      },
    });

    res.json({
      ok: true,
      sent,
      alertLevel,
      phone: targetPhone,
      rechargeReminderCount: updated.rechargeReminderCount,
      lastRechargeReminderAt: updated.lastRechargeReminderAt,
      message: `Recharge Reminder Level ${alertLevel} sent successfully to ${targetPhone} (${institute.name}).`,
    });
  } catch (err) {
    console.error('Failed to send recharge reminder:', err);
    res.status(500).json({ error: 'Failed to send recharge reminder: ' + err.message });
  }
});

/**
 * POST /api/institutes/send-recharge-reminders-batch
 * ADMIN ONLY — scans all colleges with low credit balances (<= 50 credits) and dispatches
 * automated WhatsApp recharge reminders to their registered phone numbers.
 */
router.post('/send-recharge-reminders-batch', requireAdmin, async (req, res) => {
  try {
    const threshold = req.body.threshold ? Number(req.body.threshold) : 50;

    const lowBalanceColleges = await prisma.institute.findMany({
      where: {
        creditBalance: { lte: threshold },
      },
    });

    const results = [];
    for (const inst of lowBalanceColleges) {
      const phone = inst.phone || inst.trialPhoneNumber;
      if (!phone) {
        results.push({ id: inst.id, name: inst.name, sent: false, reason: 'No phone number' });
        continue;
      }

      // Calculate level based on balance urgency
      let level = 1;
      if (inst.creditBalance <= 10) level = 3;
      else if (inst.creditBalance <= 25) level = 2;
      else level = 1;

      try {
        await whatsAppService.sendRechargeReminderAlert({
          collegeName: inst.name,
          phone,
          currentCredits: inst.creditBalance,
          alertLevel: level,
          rechargeUrl: `${process.env.APP_URL || 'https://questionstudio.in'}/#/recharge`,
        });

        const updated = await prisma.institute.update({
          where: { id: inst.id },
          data: {
            rechargeReminderCount: { increment: 1 },
            lastRechargeReminderAt: new Date(),
            lastRechargeReminderLevel: level,
          },
        });

        results.push({
          id: inst.id,
          name: inst.name,
          phone,
          credits: inst.creditBalance,
          alertLevel: level,
          sent: true,
          reminderCount: updated.rechargeReminderCount,
        });
      } catch (e) {
        results.push({ id: inst.id, name: inst.name, sent: false, error: e.message });
      }
    }

    res.json({
      ok: true,
      totalChecked: lowBalanceColleges.length,
      dispatchedCount: results.filter((r) => r.sent).length,
      results,
    });
  } catch (err) {
    console.error('Failed batch recharge reminders:', err);
    res.status(500).json({ error: 'Failed batch recharge reminders: ' + err.message });
  }
});

module.exports = router;
