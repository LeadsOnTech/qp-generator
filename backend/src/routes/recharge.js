const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../db');
const { requireAdmin } = require('../lib/auth');
const { adjustCredits } = require('../lib/credits');

const router = express.Router();

/**
 * Calculates total credits granted for a payment in rupees, including promotional bonus tiers:
 * - ₹20,000+ : 25% bonus (e.g. ₹20,000 -> 25,000 credits)
 * - ₹10,000 to ₹19,999 : 15% bonus (e.g. ₹10,000 -> 11,500 credits)
 * - Under ₹10,000 : 1:1 standard (e.g. ₹5,000 -> 5,000 credits)
 */
function calculateCreditsForRupees(amountRupees) {
  const amt = Number(amountRupees) || 0;
  if (!Number.isInteger(amt) || amt <= 0) return 0;
  let bonus = 0;
  if (amt >= 20000) {
    bonus = Math.floor(amt * 0.25);
  } else if (amt >= 10000) {
    bonus = Math.floor(amt * 0.15);
  }
  return amt + bonus;
}

// ---- QR image upload (admin only) ----
const QR_DIR = path.join(__dirname, '..', '..', 'uploads', 'images');
if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, QR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `upi-qr-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(png|jpe?g|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('QR must be a PNG, JPG or WEBP image.'));
  },
});

// ---- Settings helpers ----
async function getSetting(key) {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row ? row.value : null;
}
async function setSetting(key, value) {
  return prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * GET /api/recharge/upi-info
 * The admin's UPI details (id + QR image url) and Razorpay gateway status shown to institutes on the
 * recharge page. Readable by any signed-in user; only the admin can set it.
 */
router.get('/upi-info', async (req, res) => {
  const [upiId, payeeName, qrFilename, dbRzpKey, dbRzpSecret] = await Promise.all([
    getSetting('upi_id'),
    getSetting('upi_payee_name'),
    getSetting('upi_qr_filename'),
    getSetting('razorpay_key_id'),
    getSetting('razorpay_key_secret'),
  ]);
  const activeRzpKey = process.env.RAZORPAY_KEY_ID || dbRzpKey || null;
  const activeRzpSecret = process.env.RAZORPAY_KEY_SECRET || dbRzpSecret || null;

  res.json({
    upiId: upiId || null,
    payeeName: payeeName || null,
    qrUrl: qrFilename ? `/uploads/images/${qrFilename}` : null,
    configured: Boolean(upiId || qrFilename),
    razorpayConfigured: Boolean(activeRzpKey && activeRzpSecret),
    razorpayKeyId: activeRzpKey ? (activeRzpKey.length > 8 ? activeRzpKey.slice(0, 8) + '...' : activeRzpKey) : null,
  });
});

/**
 * PUT /api/recharge/upi-info  (admin) — set UPI id, payee name, and optional Razorpay API keys.
 */
router.put('/upi-info', requireAdmin, async (req, res) => {
  const { upiId, payeeName, razorpayKeyId, razorpayKeySecret } = req.body;
  if (upiId !== undefined) await setSetting('upi_id', String(upiId || '').trim());
  if (payeeName !== undefined) await setSetting('upi_payee_name', String(payeeName || '').trim());
  if (razorpayKeyId !== undefined) await setSetting('razorpay_key_id', String(razorpayKeyId || '').trim());
  if (razorpayKeySecret !== undefined) await setSetting('razorpay_key_secret', String(razorpayKeySecret || '').trim());
  res.json({ ok: true });
});

/**
 * POST /api/recharge/upi-qr  (admin) — upload the QR image.
 */
router.post('/upi-qr', requireAdmin, upload.single('qr'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No QR image uploaded.' });
  await setSetting('upi_qr_filename', req.file.filename);
  res.json({ ok: true, qrUrl: `/uploads/images/${req.file.filename}` });
});

/**
 * POST /api/recharge/request
 * An institute submits a recharge request AFTER paying the QR. This does
 * NOT add credits — it creates a PENDING request for the admin to verify.
 * Body: { amountRupees, upiReference, note? }
 */
router.post('/request', async (req, res) => {
  const instituteId = req.user.instituteId;
  if (!instituteId) return res.status(403).json({ error: 'Only an institute account can request a recharge.' });

  const amount = Number(req.body.amountRupees);
  const upiReference = String(req.body.upiReference || '').trim();
  const note = req.body.note ? String(req.body.note).trim() : null;

  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount in rupees (whole number, at least 1).' });
  }
  if (!upiReference) {
    return res.status(400).json({ error: 'Enter the UPI reference / transaction number from your payment app.' });
  }

  // Guard against an accidental double-submit of the same reference while
  // one is still pending.
  const dupe = await prisma.rechargeRequest.findFirst({
    where: { instituteId, upiReference, status: 'PENDING' },
  });
  if (dupe) {
    return res.status(409).json({ error: 'You already have a pending request with this reference number.' });
  }

  // Bonus credits calculated automatically according to pricing bundle tiers
  const creditsAsked = calculateCreditsForRupees(amount);

  const request = await prisma.rechargeRequest.create({
    data: {
      instituteId,
      amountRupees: amount,
      creditsAsked,
      upiReference,
      note,
      status: 'PENDING',
    },
  });
  res.json({ ok: true, request: { id: request.id, status: request.status, amountRupees: amount, creditsAsked } });
});

/**
 * GET /api/recharge/my-requests — an institute's own recharge history.
 */
router.get('/my-requests', async (req, res) => {
  const instituteId = req.user.instituteId;
  if (!instituteId) return res.status(403).json({ error: 'Institute accounts only.' });
  const rows = await prisma.rechargeRequest.findMany({
    where: { instituteId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(rows);
});

/**
 * GET /api/recharge/revenue (admin)
 * Aggregates total revenue received from both manual approvals and Razorpay.
 */
router.get('/revenue', requireAdmin, async (req, res) => {
  const approvedManual = await prisma.rechargeRequest.aggregate({
    _sum: { amountRupees: true },
    where: { status: 'APPROVED' }
  });
  const razorpay = await prisma.razorpayTransaction.aggregate({
    _sum: { amountRupees: true }
  });

  const manualTotal = approvedManual._sum.amountRupees || 0;
  const razorpayTotal = razorpay._sum.amountRupees || 0;
  
  res.json({
    manualTotal,
    razorpayTotal,
    total: manualTotal + razorpayTotal
  });
});

/**
 * GET /api/recharge/pending  (admin) — all pending requests to review,
 * with the institute name and its current balance for context.
 */
router.get('/pending', requireAdmin, async (req, res) => {
  const rows = await prisma.rechargeRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: { institute: { select: { name: true, creditBalance: true } } },
  });
  res.json(rows.map((r) => ({
    id: r.id,
    institute: r.institute?.name || '—',
    currentBalance: r.institute?.creditBalance ?? 0,
    amountRupees: r.amountRupees,
    creditsAsked: r.creditsAsked,
    upiReference: r.upiReference,
    note: r.note,
    createdAt: r.createdAt,
  })));
});

/**
 * GET /api/recharge/all  (admin) — full history (approved/rejected too).
 */
router.get('/all', requireAdmin, async (req, res) => {
  const rows = await prisma.rechargeRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { institute: { select: { name: true } } },
  });
  res.json(rows.map((r) => ({
    id: r.id,
    institute: r.institute?.name || '—',
    amountRupees: r.amountRupees,
    creditsAsked: r.creditsAsked,
    upiReference: r.upiReference,
    status: r.status,
    reviewedByEmail: r.reviewedByEmail,
    reviewNote: r.reviewNote,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  })));
});

/**
 * POST /api/recharge/:id/approve  (admin)
 * Verifies and approves — THIS is where credits are actually added, via
 * the same ledger-backed adjustCredits used everywhere else. Idempotent:
 * a request already approved won't be credited twice.
 */
router.post('/:id/approve', requireAdmin, async (req, res) => {
  const request = await prisma.rechargeRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.status !== 'PENDING') {
    return res.status(409).json({ error: `This request was already ${request.status.toLowerCase()}.` });
  }

  const bonusAmount = request.creditsAsked - request.amountRupees;
  const reasonText = bonusAmount > 0
    ? `UPI recharge (₹${request.amountRupees.toLocaleString('en-IN')} + ${bonusAmount.toLocaleString('en-IN')} bonus credits, ref ${request.upiReference})`
    : `UPI recharge (₹${request.amountRupees.toLocaleString('en-IN')}, ref ${request.upiReference})`;

  const { institute, transaction } = await adjustCredits(
    request.instituteId,
    request.creditsAsked,
    reasonText
  );

  await prisma.rechargeRequest.update({
    where: { id: request.id },
    data: {
      status: 'APPROVED',
      reviewedByEmail: req.user.email || null,
      reviewedAt: new Date(),
      creditTransactionId: transaction.id,
    },
  });

  res.json({ ok: true, creditsAdded: request.creditsAsked, newBalance: institute.creditBalance });
});

/**
 * POST /api/recharge/:id/reject  (admin)
 * Body: { reason? } — rejects without adding credits.
 */
router.post('/:id/reject', requireAdmin, async (req, res) => {
  const request = await prisma.rechargeRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.status !== 'PENDING') {
    return res.status(409).json({ error: `This request was already ${request.status.toLowerCase()}.` });
  }
  await prisma.rechargeRequest.update({
    where: { id: request.id },
    data: {
      status: 'REJECTED',
      reviewedByEmail: req.user.email || null,
      reviewNote: req.body.reason ? String(req.body.reason).trim() : null,
      reviewedAt: new Date(),
    },
  });
  res.json({ ok: true });
});

// ---------- Razorpay Automated Gateway ----------
const Razorpay = require('razorpay');
const crypto = require('crypto');

async function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID || await getSetting('razorpay_key_id');
  const key_secret = process.env.RAZORPAY_KEY_SECRET || await getSetting('razorpay_key_secret');
  if (!key_id || !key_secret) return null;
  return { client: new Razorpay({ key_id, key_secret }), key_id, key_secret };
}

/**
 * POST /api/recharge/razorpay/create
 * Creates a Razorpay order. Fails gracefully if keys aren't set.
 */
router.post('/razorpay/create', async (req, res) => {
  const instituteId = req.user.instituteId;
  if (!instituteId) return res.status(403).json({ error: 'Only an institute account can recharge.' });

  const amountRupees = Number(req.body.amountRupees);
  if (!Number.isInteger(amountRupees) || amountRupees <= 0) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }

  const rzpObj = await getRazorpayClient();
  if (!rzpObj) {
    return res.status(503).json({ error: 'Razorpay is not configured on this server yet.' });
  }
  const { client: rzp, key_id } = rzpObj;

  try {
    const creditsBought = calculateCreditsForRupees(amountRupees);
    const order = await rzp.orders.create({
      amount: amountRupees * 100, // Razorpay takes paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        instituteId,
        amountRupees,
        creditsBought,
      }
    });

    await prisma.razorpayTransaction.create({
      data: {
        instituteId,
        orderId: order.id,
        amountRupees,
        creditsBought,
      }
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: key_id,
      creditsBought
    });
  } catch (err) {
    console.error('Razorpay Create Error:', err);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

/**
 * POST /api/recharge/razorpay/verify
 * Validates the Razorpay signature. If valid, grants credits instantly.
 */
router.post('/razorpay/verify', async (req, res) => {
  const instituteId = req.user.instituteId;
  if (!instituteId) return res.status(403).json({ error: 'Only an institute account can recharge.' });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details.' });
  }

  const rzpObj = await getRazorpayClient();
  if (!rzpObj) return res.status(503).json({ error: 'Razorpay is not configured.' });
  const { key_secret } = rzpObj;

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    await prisma.razorpayTransaction.update({
      where: { orderId: razorpay_order_id },
      data: { status: 'FAILED' }
    });
    return res.status(400).json({ error: 'Invalid payment signature. Payment failed.' });
  }

  // Signature is valid. Grant credits if not already granted.
  const tx = await prisma.razorpayTransaction.findUnique({ where: { orderId: razorpay_order_id } });
  if (!tx) return res.status(404).json({ error: 'Order not found.' });
  if (tx.status === 'SUCCESS') return res.json({ ok: true, message: 'Already processed.', creditsAdded: tx.creditsBought });

  await prisma.razorpayTransaction.update({
    where: { orderId: razorpay_order_id },
    data: { status: 'SUCCESS', paymentId: razorpay_payment_id, signature: razorpay_signature, completedAt: new Date() }
  });

  const bonusAmount = tx.creditsBought - tx.amountRupees;
  const reasonText = bonusAmount > 0
    ? `Instant recharge via Razorpay (₹${tx.amountRupees.toLocaleString('en-IN')} + ${bonusAmount.toLocaleString('en-IN')} bonus credits, Order: ${razorpay_order_id})`
    : `Instant recharge via Razorpay (₹${tx.amountRupees.toLocaleString('en-IN')}, Order: ${razorpay_order_id})`;

  const { institute } = await adjustCredits(
    instituteId,
    tx.creditsBought,
    reasonText
  );

  res.json({ ok: true, creditsAdded: tx.creditsBought, newBalance: institute.creditBalance });
});

module.exports = router;
