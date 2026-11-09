const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('../lib/auth');
const {
  getPaymentConfig,
  createSubscriptionPaymentOrder,
  verifyPaymentSignature,
  activatePaidSubscription,
  processWebhookEvent,
  recordOfflineVerifiedPayment,
  processPaymentRefund,
} = require('../lib/subscriptionPayment');

const router = express.Router();

// Helper: Safely resolve instituteId from authenticated user session
async function resolveAuthInstituteId(req) {
  let instituteId = req.user?.instituteId;
  if (!instituteId && req.user?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { instituteId: true },
    });
    instituteId = user?.instituteId || null;
    if (instituteId && req.user) req.user.instituteId = instituteId;
  }
  return instituteId;
}

// ============================================================================
// 1. PUBLIC WEBHOOK ENDPOINT (Cryptographic Signature Verification)
// ============================================================================

/**
 * POST /api/subscriptions/payment/webhook
 * Public endpoint called directly by Razorpay servers.
 * Verified with HMAC-SHA256 signature using RAZORPAY_WEBHOOK_SECRET.
 */
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const eventId = req.headers['x-razorpay-event-id'] || req.body?.id || `evt_${Date.now()}`;
  const eventType = req.body?.event;

  if (!signature) {
    return res.status(400).json({ error: 'Missing X-Razorpay-Signature header.' });
  }

  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const result = await processWebhookEvent({
      eventId,
      eventType,
      payload: req.body,
      rawBody,
      signature,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Razorpay Webhook Error:', err);
    if (err.message.includes('INVALID_WEBHOOK_SIGNATURE')) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }
    return res.status(500).json({ error: 'Failed to process webhook event: ' + err.message });
  }
});

// ============================================================================
// 2. COLLEGE ADMIN PAYMENT APIS (Strictly Scoped to Authenticated Tenant)
// ============================================================================

/**
 * POST /api/subscriptions/payment/order
 * Initiates an online subscription payment.
 * Computes prices server-side in integer paise and creates a Razorpay order.
 */
router.post('/order', async (req, res) => {
  try {
    const instituteId = await resolveAuthInstituteId(req);
    if (!instituteId) {
      return res.status(403).json({ error: 'An active institutional account is required to order subscriptions.' });
    }

    const { moduleKey, billingCycle = 'MONTHLY', notes = null } = req.body;
    if (!moduleKey) {
      return res.status(400).json({ error: 'moduleKey is required.' });
    }

    const orderData = await createSubscriptionPaymentOrder({
      instituteId,
      moduleKey,
      billingCycle,
      requestedByEmail: req.user?.email || null,
      notes,
    });

    return res.json(orderData);
  } catch (err) {
    console.error('Create Subscription Payment Order Error:', err);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/subscriptions/payment/verify
 * Validates Razorpay client-side signature.
 * Activates subscription and generates invoice upon successful verification.
 */
router.post('/verify', async (req, res) => {
  try {
    const instituteId = await resolveAuthInstituteId(req);
    if (!instituteId) {
      return res.status(403).json({ error: 'An active institutional account is required.' });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMethod = 'upi',
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required Razorpay payment credentials.' });
    }

    // 1. Locate internal payment record
    const payment = await prisma.subscriptionPayment.findUnique({
      where: { gatewayOrderId: razorpay_order_id },
    });

    if (!payment) {
      return res.status(404).json({ error: `Payment order '${razorpay_order_id}' not found.` });
    }

    // 2. Tenant isolation check
    if (payment.instituteId !== instituteId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Payment order does not belong to your college.' });
    }

    // 3. Idempotency Check: Already processed?
    if (payment.status === 'SUCCESS') {
      const existingSub = payment.subscriptionId
        ? await prisma.collegeSubscription.findUnique({ where: { id: payment.subscriptionId } })
        : null;
      return res.json({
        ok: true,
        alreadyProcessed: true,
        message: 'Payment already verified and subscription activated.',
        subscription: existingSub,
      });
    }

    // 4. Verify HMAC SHA-256 signature
    const config = await getPaymentConfig();
    const isSignatureValid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret: config.key_secret,
    });

    if (!isSignatureValid) {
      await prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: 'INVALID_SIGNATURE: Client signature verification failed.',
        },
      });
      return res.status(400).json({ error: 'Invalid payment signature. Payment failed verification.' });
    }

    // 5. Atomic activation and invoice generation
    const result = await activatePaidSubscription({
      paymentId: payment.id,
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignature: razorpay_signature,
      paymentMethod,
    });

    return res.json({
      ok: true,
      message: `Successfully verified payment and activated subscription for ${payment.moduleKey}!`,
      ...result,
    });
  } catch (err) {
    console.error('Verify Subscription Payment Error:', err);
    return res.status(500).json({ error: 'Failed to verify payment: ' + err.message });
  }
});

/**
 * GET /api/subscriptions/payment/history
 * Returns paginated payment history and invoices for the logged-in college.
 */
router.get('/history', async (req, res) => {
  try {
    const instituteId = await resolveAuthInstituteId(req);
    if (!instituteId) {
      return res.status(403).json({ error: 'Institutional account required.' });
    }

    const payments = await prisma.subscriptionPayment.findMany({
      where: { instituteId },
      include: {
        invoice: true,
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      ok: true,
      payments,
    });
  } catch (err) {
    console.error('Fetch Payment History Error:', err);
    return res.status(500).json({ error: 'Failed to fetch payment history: ' + err.message });
  }
});

/**
 * GET /api/subscriptions/payment/invoice/:id
 * Fetches an invoice by ID. Scoped to the college (or Super Admin).
 */
router.get('/invoice/:id', async (req, res) => {
  try {
    const invoice = await prisma.subscriptionInvoice.findUnique({
      where: { id: req.params.id },
      include: {
        payment: true,
        institute: {
          select: { id: true, name: true, phone: true, address: true, logoFilename: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // Enforce tenant isolation unless Super Admin
    if (req.user?.role !== 'ADMIN' && req.user?.instituteId !== invoice.instituteId) {
      return res.status(403).json({ error: 'Access denied to this invoice.' });
    }

    return res.json({
      ok: true,
      invoice,
    });
  } catch (err) {
    console.error('Fetch Invoice Error:', err);
    return res.status(500).json({ error: 'Failed to fetch invoice: ' + err.message });
  }
});

// ============================================================================
// 3. SUPER ADMIN FINANCIAL RECONCILIATION & REPORTING APIS
// ============================================================================

/**
 * Helper: Sanitizes a string for CSV cell export
 */
function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * GET /api/subscriptions/payment/admin/reconciliation
 * Super Admin only: Global financial command, gateway reconciliation, filterable ledger, and revenue analytics.
 */
router.get('/admin/reconciliation', requireAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      instituteId,
      moduleKey,
      billingCycle,
      status,
      search,
    } = req.query;

    // 1. Build filter for payments table
    const where = {};
    if (instituteId && instituteId !== 'ALL') where.instituteId = instituteId;
    if (moduleKey && moduleKey !== 'ALL') where.moduleKey = moduleKey;
    if (billingCycle && billingCycle !== 'ALL') where.billingCycle = billingCycle.toUpperCase();
    if (status && status !== 'ALL') where.status = status.toUpperCase();

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { gatewayOrderId: { contains: term } },
        { gatewayPaymentId: { contains: term } },
        { receiptNumber: { contains: term } },
        { requestedByEmail: { contains: term } },
        { institute: { name: { contains: term } } },
        { invoice: { invoiceNumber: { contains: term } } },
      ];
    }

    // 2. Fetch filtered payments and global platform counts in parallel
    const [
      filteredPayments,
      allPaymentsForKpis,
      activeSubsCount,
      pendingRequests,
      allInvoices,
      allWebhookLogs,
      institutesList,
    ] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        include: {
          institute: { select: { id: true, name: true, slug: true, phone: true } },
          invoice: true,
          subscription: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      prisma.subscriptionPayment.findMany({
        select: {
          status: true,
          billingCycle: true,
          moduleKey: true,
          baseAmountPaise: true,
          taxAmountPaise: true,
          totalAmountPaise: true,
          gatewayFeePaise: true,
          netSettledPaise: true,
          refundAmountPaise: true,
          createdAt: true,
        },
      }),
      prisma.collegeSubscription.count({
        where: { status: 'ACTIVE', isActive: true },
      }),
      prisma.collegeSubscription.findMany({
        where: { status: 'PENDING_VERIFICATION' },
        include: {
          institute: { select: { id: true, name: true, slug: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subscriptionInvoice.findMany({
        include: {
          institute: { select: { id: true, name: true } },
          payment: { select: { id: true, gatewayOrderId: true, gatewayPaymentId: true, paymentMethod: true, status: true } },
        },
        orderBy: { invoiceDate: 'desc' },
        take: 200,
      }),
      prisma.paymentWebhookLog.findMany({
        orderBy: { receivedAt: 'desc' },
        take: 30,
      }),
      prisma.institute.findMany({
        select: { id: true, name: true, whatsAppWalletBalance: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // 3. Global KPI Calculations (Never count pending or failed as revenue!)
    let totalCollectedPaise = 0;
    let monthlyRevenuePaise = 0;
    let annualRevenuePaise = 0;
    let pendingPaymentsPaise = 0;
    let pendingPaymentsCount = 0;
    let failedPaymentsPaise = 0;
    let failedPaymentsCount = 0;
    let refundedPaymentsPaise = 0;
    let refundedPaymentsCount = 0;
    let successfulTransactionsCount = 0;
    let totalTaxCollectedPaise = 0;
    let totalGatewayFeesPaise = 0;
    let totalNetSettledPaise = 0;
    let whatsAppSoftwareRevenuePaise = 0;

    allPaymentsForKpis.forEach((p) => {
      if (p.status === 'SUCCESS') {
        successfulTransactionsCount++;
        totalCollectedPaise += p.totalAmountPaise;
        totalTaxCollectedPaise += p.taxAmountPaise;
        if (p.gatewayFeePaise) totalGatewayFeesPaise += p.gatewayFeePaise;
        if (p.netSettledPaise) totalNetSettledPaise += p.netSettledPaise;

        if (p.billingCycle === 'ANNUAL') {
          annualRevenuePaise += p.totalAmountPaise;
        } else {
          monthlyRevenuePaise += p.totalAmountPaise;
        }

        if (p.moduleKey === 'WHATSAPP') {
          whatsAppSoftwareRevenuePaise += p.totalAmountPaise;
        }
      } else if (p.status === 'PENDING') {
        pendingPaymentsCount++;
        pendingPaymentsPaise += p.totalAmountPaise;
      } else if (p.status === 'FAILED') {
        failedPaymentsCount++;
        failedPaymentsPaise += p.totalAmountPaise;
      } else if (p.status === 'REFUNDED') {
        refundedPaymentsCount++;
        refundedPaymentsPaise += (p.refundAmountPaise || p.totalAmountPaise);
      }
    });

    // WhatsApp Message Wallet segregation
    let totalWhatsAppWalletBalance = 0;
    institutesList.forEach((inst) => {
      totalWhatsAppWalletBalance += (inst.whatsAppWalletBalance || 0);
    });

    // 4. Pre-aggregated Financial Reports
    // A. Daily payment report (grouped by date of successful payments)
    const dailyMap = {};
    const monthlyMap = {};
    const annualMap = {};
    const moduleMap = {};
    const collegeMap = {};
    let totalTaxableBasePaise = 0;
    let totalCgstPaise = 0;
    let totalSgstPaise = 0;
    let totalIgstPaise = 0;

    filteredPayments.forEach((p) => {
      if (p.status === 'SUCCESS') {
        const dateKey = p.paidAt ? p.paidAt.toISOString().slice(0, 10) : p.createdAt.toISOString().slice(0, 10);
        const monthKey = dateKey.slice(0, 7);
        const yearKey = dateKey.slice(0, 4);

        // Daily
        if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, amountPaise: 0, count: 0 };
        dailyMap[dateKey].amountPaise += p.totalAmountPaise;
        dailyMap[dateKey].count += 1;

        // Monthly
        if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthKey, amountPaise: 0, count: 0 };
        monthlyMap[monthKey].amountPaise += p.totalAmountPaise;
        monthlyMap[monthKey].count += 1;

        // Annual
        if (!annualMap[yearKey]) annualMap[yearKey] = { year: yearKey, amountPaise: 0, count: 0 };
        annualMap[yearKey].amountPaise += p.totalAmountPaise;
        annualMap[yearKey].count += 1;

        // Module
        if (!moduleMap[p.moduleKey]) moduleMap[p.moduleKey] = { moduleKey: p.moduleKey, amountPaise: 0, count: 0 };
        moduleMap[p.moduleKey].amountPaise += p.totalAmountPaise;
        moduleMap[p.moduleKey].count += 1;

        // College
        const instName = p.institute?.name || 'Unknown College';
        if (!collegeMap[p.instituteId]) collegeMap[p.instituteId] = { instituteId: p.instituteId, name: instName, amountPaise: 0, count: 0 };
        collegeMap[p.instituteId].amountPaise += p.totalAmountPaise;
        collegeMap[p.instituteId].count += 1;

        // GST Breakdown
        totalTaxableBasePaise += p.baseAmountPaise;
        if (p.invoice) {
          totalCgstPaise += p.invoice.cgstAmountPaise;
          totalSgstPaise += p.invoice.sgstAmountPaise;
          totalIgstPaise += p.invoice.igstAmountPaise;
        } else {
          // Half-half intra-state fallback
          totalCgstPaise += Math.round(p.taxAmountPaise / 2);
          totalSgstPaise += p.taxAmountPaise - Math.round(p.taxAmountPaise / 2);
        }
      }
    });

    const dailyReport = Object.values(dailyMap)
      .map((d) => ({ ...d, amountRupees: Math.round(d.amountPaise / 100) }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const monthlyReport = Object.values(monthlyMap)
      .map((m) => ({ ...m, amountRupees: Math.round(m.amountPaise / 100) }))
      .sort((a, b) => b.month.localeCompare(a.month));

    const annualReport = Object.values(annualMap)
      .map((y) => ({ ...y, amountRupees: Math.round(y.amountPaise / 100) }))
      .sort((a, b) => b.year.localeCompare(a.year));

    const moduleReport = Object.values(moduleMap)
      .map((m) => ({ ...m, amountRupees: Math.round(m.amountPaise / 100) }))
      .sort((a, b) => b.amountPaise - a.amountPaise);

    const collegeReport = Object.values(collegeMap)
      .map((c) => ({ ...c, amountRupees: Math.round(c.amountPaise / 100) }))
      .sort((a, b) => b.amountPaise - a.amountPaise);

    return res.json({
      ok: true,
      summary: {
        totalCollectedPaise,
        totalCollectedRupees: Math.round(totalCollectedPaise / 100),
        monthlyRevenuePaise,
        monthlyRevenueRupees: Math.round(monthlyRevenuePaise / 100),
        annualRevenuePaise,
        annualRevenueRupees: Math.round(annualRevenuePaise / 100),
        pendingPaymentsCount,
        pendingPaymentsPaise,
        pendingPaymentsRupees: Math.round(pendingPaymentsPaise / 100),
        failedPaymentsCount,
        failedPaymentsPaise,
        failedPaymentsRupees: Math.round(failedPaymentsPaise / 100),
        refundedPaymentsCount,
        refundedPaymentsPaise,
        refundedPaymentsRupees: Math.round(refundedPaymentsPaise / 100),
        totalActivePaidSubscriptions: activeSubsCount,
        outstandingOfflineRequestsCount: pendingRequests.length,
        totalInvoicesIssued: allInvoices.length,
        successfulTransactionsCount,
        totalTaxCollectedPaise,
        totalTaxCollectedRupees: Math.round(totalTaxCollectedPaise / 100),
        totalGatewayFeesPaise,
        totalNetSettledPaise,
        whatsAppSoftwareRevenuePaise,
        whatsAppSoftwareRevenueRupees: Math.round(whatsAppSoftwareRevenuePaise / 100),
        totalWhatsAppWalletBalance,
      },
      reports: {
        daily: dailyReport,
        monthly: monthlyReport,
        annual: annualReport,
        moduleWise: moduleReport,
        collegeWise: collegeReport,
        gstSummary: {
          taxableBaseRupees: Math.round(totalTaxableBasePaise / 100),
          cgstRupees: Math.round(totalCgstPaise / 100),
          sgstRupees: Math.round(totalSgstPaise / 100),
          igstRupees: Math.round(totalIgstPaise / 100),
          totalTaxRupees: Math.round((totalCgstPaise + totalSgstPaise + totalIgstPaise) / 100),
        },
        refundSummary: {
          count: refundedPaymentsCount,
          totalRefundedRupees: Math.round(refundedPaymentsPaise / 100),
        },
      },
      payments: filteredPayments,
      invoices: allInvoices,
      offlineRequests: pendingRequests,
      institutesList,
      webhookLogs: allWebhookLogs,
    });
  } catch (err) {
    console.error('Super Admin Financial Reconciliation Error:', err);
    return res.status(500).json({ error: 'Failed to generate financial reconciliation: ' + err.message });
  }
});

/**
 * GET /api/subscriptions/payment/admin/export-csv
 * Super Admin only: Generates downloadable CSV report of subscription payment transactions.
 */
router.get('/admin/export-csv', requireAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      instituteId,
      moduleKey,
      billingCycle,
      status,
    } = req.query;

    const where = {};
    if (instituteId && instituteId !== 'ALL') where.instituteId = instituteId;
    if (moduleKey && moduleKey !== 'ALL') where.moduleKey = moduleKey;
    if (billingCycle && billingCycle !== 'ALL') where.billingCycle = billingCycle.toUpperCase();
    if (status && status !== 'ALL') where.status = status.toUpperCase();

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const payments = await prisma.subscriptionPayment.findMany({
      where,
      include: {
        institute: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const headers = [
      'Payment Date',
      'College Name',
      'Module',
      'Billing Cycle',
      'Base Amount (INR)',
      'GST Rate (%)',
      'GST Amount (INR)',
      'Total Amount (INR)',
      'Gateway Provider',
      'Payment Ref / UTR',
      'Order ID',
      'Payment Status',
      'Invoice Number',
      'Notes',
    ];

    const rows = payments.map((p) => {
      const dateStr = p.paidAt
        ? new Date(p.paidAt).toISOString().slice(0, 19).replace('T', ' ')
        : new Date(p.createdAt).toISOString().slice(0, 19).replace('T', ' ');

      return [
        escapeCsvCell(dateStr),
        escapeCsvCell(p.institute?.name || 'N/A'),
        escapeCsvCell(p.moduleKey),
        escapeCsvCell(p.billingCycle),
        escapeCsvCell((p.baseAmountPaise / 100).toFixed(2)),
        escapeCsvCell('18%'),
        escapeCsvCell((p.taxAmountPaise / 100).toFixed(2)),
        escapeCsvCell((p.totalAmountPaise / 100).toFixed(2)),
        escapeCsvCell(p.gatewayProvider || 'RAZORPAY'),
        escapeCsvCell(p.gatewayPaymentId || 'N/A'),
        escapeCsvCell(p.gatewayOrderId),
        escapeCsvCell(p.status),
        escapeCsvCell(p.invoice?.invoiceNumber || 'PENDING'),
        escapeCsvCell(p.notes || ''),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="QuestionsStudio_Subscriptions_Financial_Report.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('Super Admin CSV Export Error:', err);
    return res.status(500).json({ error: 'Failed to export CSV: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/payment/admin/record-offline-payment
 * Super Admin only: Records a verified offline manual payment (NEFT/Cheque/Bank Transfer).
 * Creates a SUCCESS payment ledger record, generates invoice, activates subscription, and collects revenue.
 */
router.post('/admin/record-offline-payment', requireAdmin, async (req, res) => {
  try {
    const {
      instituteId,
      moduleKey,
      billingCycle = 'MONTHLY',
      paymentMethod = 'NEFT_RTGS',
      paymentRef,
      paymentDate = null,
      notes = null,
      subscriptionId = null,
    } = req.body;

    if (!instituteId || !moduleKey || !paymentRef) {
      return res.status(400).json({
        error: 'instituteId, moduleKey, and paymentRef (UTR / Cheque / Bank Ref) are required.',
      });
    }

    const result = await recordOfflineVerifiedPayment({
      instituteId,
      moduleKey,
      billingCycle,
      paymentMethod,
      paymentRef,
      paymentDate,
      notes,
      adminEmail: req.user?.email || 'admin@questionstudio.com',
      subscriptionId,
    });

    return res.json({
      ok: true,
      message: `Verified offline payment for ${moduleKey} successfully recorded! Subscription activated and tax invoice generated.`,
      ...result,
    });
  } catch (err) {
    console.error('Super Admin Record Offline Payment Error:', err);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/subscriptions/payment/admin/refund
 * Super Admin only: Processes and records a refund for a previously captured subscription payment.
 * Prevents duplicate refunds, updates payment and invoice status, and deactivates subscription.
 */
router.post('/admin/refund', requireAdmin, async (req, res) => {
  try {
    const {
      paymentId,
      refundReference,
      refundAmountPaise = null,
      reason = null,
      deactivateSubscription = true,
    } = req.body;

    if (!paymentId || !refundReference) {
      return res.status(400).json({ error: 'paymentId and refundReference are required.' });
    }

    const result = await processPaymentRefund({
      paymentId,
      refundReference,
      refundAmountPaise,
      reason,
      adminEmail: req.user?.email || 'admin@questionstudio.com',
      deactivateSubscription,
    });

    return res.json({
      ok: true,
      message: 'Refund recorded successfully. Subscription and tax invoice updated.',
      ...result,
    });
  } catch (err) {
    console.error('Super Admin Refund Error:', err);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/subscriptions/payment/admin/tax-config
 * Super Admin only: Returns tax settings, SAC classification, seller metadata, and CA approval status.
 */
router.get('/admin/tax-config', requireAdmin, async (req, res) => {
  try {
    const config = await getPaymentConfig();
    return res.json({
      ok: true,
      config: {
        gstRateBps: config.gstRateBps,
        gstRatePercent: (config.gstRateBps / 100).toFixed(2),
        sacCode: config.sacCode,
        sellerGstin: config.sellerGstin,
        sellerName: config.sellerName,
        sellerAddress: config.sellerAddress,
        sellerState: config.sellerState,
        invoicePrefix: config.invoicePrefix,
        caApproved: config.caApproved === 'true',
        notes: 'Awaiting Chartered Accountant (CA) formal sign-off for SAC classification and applicable GST rate before live filing.',
      },
    });
  } catch (err) {
    console.error('Fetch Tax Config Error:', err);
    return res.status(500).json({ error: 'Failed to fetch tax configuration: ' + err.message });
  }
});

/**
 * PUT /api/subscriptions/payment/admin/tax-config
 * Super Admin only: Updates configurable tax settings and seller metadata in AppSetting.
 */
router.put('/admin/tax-config', requireAdmin, async (req, res) => {
  try {
    const {
      gstRateBps,
      sacCode,
      sellerGstin,
      sellerName,
      sellerAddress,
      sellerState,
      invoicePrefix,
      caApproved,
    } = req.body;

    const upserts = [];
    if (gstRateBps !== undefined) {
      const bps = parseInt(gstRateBps, 10);
      if (isNaN(bps) || bps < 0 || bps > 10000) {
        return res.status(400).json({ error: 'gstRateBps must be an integer between 0 and 10000 (e.g. 1800 for 18%).' });
      }
      upserts.push(prisma.appSetting.upsert({ where: { key: 'subscription_gst_rate_bps' }, update: { value: String(bps) }, create: { key: 'subscription_gst_rate_bps', value: String(bps) } }));
    }

    if (sacCode !== undefined) {
      upserts.push(prisma.appSetting.upsert({ where: { key: 'subscription_sac_code' }, update: { value: String(sacCode || '').trim() }, create: { key: 'subscription_sac_code', value: String(sacCode || '').trim() } }));
    }

    if (sellerGstin !== undefined) {
      upserts.push(prisma.appSetting.upsert({ where: { key: 'subscription_seller_gstin' }, update: { value: String(sellerGstin || '').trim().toUpperCase() }, create: { key: 'subscription_seller_gstin', value: String(sellerGstin || '').trim().toUpperCase() } }));
    }

    if (sellerName !== undefined) {
      upserts.push(prisma.appSetting.upsert({ where: { key: 'subscription_seller_name' }, update: { value: String(sellerName || '').trim() }, create: { key: 'subscription_seller_name', value: String(sellerName || '').trim() } }));
    }

    if (sellerAddress !== undefined) {
      upserts.push(prisma.appSetting.upsert({ where: { key: 'subscription_seller_address' }, update: { value: String(sellerAddress || '').trim() }, create: { key: 'subscription_seller_address', value: String(sellerAddress || '').trim() } }));
    }

    if (sellerState !== undefined) {
      upserts.push(prisma.appSetting.upsert({ where: { key: 'subscription_seller_state' }, update: { value: String(sellerState || '').trim() }, create: { key: 'subscription_seller_state', value: String(sellerState || '').trim() } }));
    }

    if (invoicePrefix !== undefined) {
      upserts.push(prisma.appSetting.upsert({ where: { key: 'subscription_invoice_prefix' }, update: { value: String(invoicePrefix || 'QS').trim().toUpperCase() }, create: { key: 'subscription_invoice_prefix', value: String(invoicePrefix || 'QS').trim().toUpperCase() } }));
    }

    if (caApproved !== undefined) {
      upserts.push(prisma.appSetting.upsert({ where: { key: 'subscription_tax_ca_approved' }, update: { value: String(Boolean(caApproved)) }, create: { key: 'subscription_tax_ca_approved', value: String(Boolean(caApproved)) } }));
    }

    await Promise.all(upserts);

    return res.json({
      ok: true,
      message: 'GST and tax configuration updated successfully in database settings.',
    });
  } catch (err) {
    console.error('Update Tax Config Error:', err);
    return res.status(500).json({ error: 'Failed to update tax configuration: ' + err.message });
  }
});

module.exports = router;
