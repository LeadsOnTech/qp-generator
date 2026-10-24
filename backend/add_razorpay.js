const fs = require('fs');
const content = fs.readFileSync('src/routes/recharge.js', 'utf-8');

const additional = \

// ---------- Razorpay Automated Gateway ----------
const Razorpay = require('razorpay');
const crypto = require('crypto');

function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
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

  const rzp = getRazorpayClient();
  if (!rzp) {
    return res.status(503).json({ error: 'Razorpay is not configured on this server yet.' });
  }

  try {
    const creditsBought = amountRupees; // 1 credit = 1 rupee for now
    const order = await rzp.orders.create({
      amount: amountRupees * 100, // Razorpay takes paise
      currency: 'INR',
      receipt: \\\cpt_\\$\\{Date.now()\\}\\\,
    });

    await prisma.razorpayTransaction.create({
      data: {
        instituteId,
        orderId: order.id,
        amountRupees,
        creditsBought,
      }
    });

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID });
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

  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) return res.status(503).json({ error: 'Razorpay is not configured.' });

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
  if (tx.status === 'SUCCESS') return res.json({ ok: true, message: 'Already processed.' });

  await prisma.razorpayTransaction.update({
    where: { orderId: razorpay_order_id },
    data: { status: 'SUCCESS', paymentId: razorpay_payment_id, signature: razorpay_signature, completedAt: new Date() }
  });

  await adjustCredits(
    instituteId,
    tx.creditsBought,
    \\\Instant recharge via Razorpay (Order: \\$\\{razorpay_order_id\\})\\\
  );

  res.json({ ok: true, creditsAdded: tx.creditsBought });
});
module.exports = router;
\;

fs.writeFileSync('src/routes/recharge.js', content.replace('module.exports = router;', '') + additional);
console.log('Appended Razorpay endpoints.');

