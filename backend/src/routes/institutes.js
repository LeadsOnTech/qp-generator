const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../db');
const { requireAdmin } = require('../lib/auth');
const { adjustCredits } = require('../lib/credits');

const router = express.Router();

function generateDummyCredentials() {
  const suffix = crypto.randomBytes(3).toString('hex'); // e.g. "a1b2c3"
  const email = `trial-${suffix}@questionforge.local`;
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
    isTrial: i.isTrial,
    trialPhoneNumber: i.trialPhoneNumber,
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
  const { name, phone, address, tagline, logoFilename } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Institute name is required.' });
  }

  let slug = slugify(name);
  const existing = await prisma.institute.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const institute = await prisma.institute.create({
    data: {
      name: name.trim(),
      slug,
      phone: phone || null,
      address: address || null,
      tagline: tagline || null,
      logoFilename: logoFilename || null,
    },
  });

  res.json({ id: institute.id, name: institute.name, slug: institute.slug });
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
  const { instituteName, phone } = req.body;
  const { email, password } = generateDummyCredentials();
  const passwordHash = await bcrypt.hash(password, 10);

  const name = (instituteName && instituteName.trim()) || `Trial Account ${new Date().toLocaleDateString('en-IN')}`;
  let slug = slugify(name) + '-' + crypto.randomBytes(2).toString('hex');

  const institute = await prisma.institute.create({
    data: {
      name,
      slug,
      isTrial: true,
      trialPhoneNumber: phone || null,
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
});

/**
 * GET /api/institutes/trial/list
 * ADMIN ONLY — every trial account ever generated, with enough info to
 * drive the sales follow-up workflow: which phone number it was sent to,
 * whether it's been logged into yet, and how many credits are left.
 */
router.get('/trial/list', requireAdmin, async (req, res) => {
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

module.exports = router;
