const crypto = require('crypto');
const Razorpay = require('razorpay');
const prisma = require('../db');
const whatsappService = require('./whatsapp');
const { MODULE_KEYS, MODULE_PRICING } = require('./subscriptions');

// ============================================================================
// 1. CONFIGURATION & CREDENTIAL RESOLUTION
// ============================================================================

async function getSetting(key) {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row ? row.value : null;
}

/**
 * Resolves Razorpay credentials and configuration from env or AppSetting.
 */
async function getPaymentConfig() {
  const [
    dbKeyId,
    dbKeySecret,
    dbWebhookSecret,
    dbGstBps,
    dbSacCode,
    dbSellerGstin,
    dbSellerName,
    dbSellerAddress,
    dbSellerState,
    dbInvoicePrefix,
    dbCaApproved,
  ] = await Promise.all([
    getSetting('razorpay_key_id'),
    getSetting('razorpay_key_secret'),
    getSetting('razorpay_webhook_secret'),
    getSetting('subscription_gst_rate_bps'),
    getSetting('subscription_sac_code'),
    getSetting('subscription_seller_gstin'),
    getSetting('subscription_seller_name'),
    getSetting('subscription_seller_address'),
    getSetting('subscription_seller_state'),
    getSetting('subscription_invoice_prefix'),
    getSetting('subscription_tax_ca_approved'),
  ]);

  const key_id = process.env.RAZORPAY_KEY_ID || dbKeyId || null;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || dbKeySecret || null;
  const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET || dbWebhookSecret || 'qs_test_webhook_secret_2026';
  
  // Tax rate in basis points (1800 bps = 18.00% standard GST)
  const gstRateBps = dbGstBps ? parseInt(dbGstBps, 10) : 1800;

  // Determine if in mock test mode (e.g. dummy/test keys or unconfigured)
  const isMockMode = !key_id || !key_secret || key_id.startsWith('rzp_test_mock') || process.env.NODE_ENV === 'test';

  let rzpClient = null;
  if (!isMockMode && key_id && key_secret) {
    try {
      rzpClient = new Razorpay({ key_id, key_secret });
    } catch (e) {
      console.warn('Failed to initialize Razorpay SDK client:', e.message);
    }
  }

  return {
    key_id: key_id || 'rzp_test_mock_key_2026',
    key_secret: key_secret || 'mock_secret_key_2026_test',
    webhook_secret,
    gstRateBps: isNaN(gstRateBps) ? 1800 : gstRateBps,
    sacCode: dbSacCode || '998313',
    sellerGstin: dbSellerGstin || '36AAACQ0000A1Z5',
    sellerName: dbSellerName || 'QuestionsStudio EdTech Technologies Pvt. Ltd.',
    sellerAddress: dbSellerAddress || 'Hyderabad, Telangana, India',
    sellerState: dbSellerState || 'Telangana',
    invoicePrefix: dbInvoicePrefix || 'QS',
    caApproved: dbCaApproved || 'false',
    isMockMode,
    rzpClient,
  };
}

// ============================================================================
// 2. FINANCIAL ARITHMETIC UTILITIES (Pure Integer Paise & Basis Points)
// ============================================================================

/**
 * Calculates exact tax in paise using basis points.
 */
function calculateTaxPaise(taxableAmountPaise, taxRateBps) {
  if (!taxRateBps || taxRateBps <= 0) return 0;
  return Math.round((taxableAmountPaise * taxRateBps) / 10000);
}

/**
 * Calculates intra-state tax split (CGST + SGST) in exact paise.
 */
function calculateIntraStateTaxSplit(taxableAmountPaise, totalTaxRateBps) {
  const halfRateBps = Math.floor(totalTaxRateBps / 2);
  const cgstPaise = Math.round((taxableAmountPaise * halfRateBps) / 10000);
  const totalTaxPaise = calculateTaxPaise(taxableAmountPaise, totalTaxRateBps);
  const sgstPaise = totalTaxPaise - cgstPaise;
  return { cgstPaise, sgstPaise, totalTaxPaise };
}

/**
 * Calculates GST tax split in exact integer paise for both Intra-state (CGST+SGST) and Inter-state (IGST).
 */
function calculateTaxBreakdown(taxableAmountPaise, totalTaxRateBps, isInterState = false) {
  const totalTaxPaise = calculateTaxPaise(taxableAmountPaise, totalTaxRateBps);
  if (isInterState) {
    return { cgstPaise: 0, sgstPaise: 0, igstPaise: totalTaxPaise, totalTaxPaise };
  }
  const halfRateBps = Math.floor(totalTaxRateBps / 2);
  const cgstPaise = Math.round((taxableAmountPaise * halfRateBps) / 10000);
  const sgstPaise = totalTaxPaise - cgstPaise;
  return { cgstPaise, sgstPaise, igstPaise: 0, totalTaxPaise };
}

/**
 * Validates moduleKey and cycle and computes trusted integer prices.
 */
function calculateSubscriptionPricePaise(moduleKey, billingCycle, taxRateBps = 1800) {
  if (!moduleKey || !MODULE_KEYS[moduleKey]) {
    throw new Error(`Invalid moduleKey '${moduleKey}'. Valid keys: ${Object.keys(MODULE_KEYS).join(', ')}`);
  }

  const cycle = (billingCycle || 'MONTHLY').toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
  const pricing = MODULE_PRICING[moduleKey];
  if (!pricing) {
    throw new Error(`No pricing configured for moduleKey '${moduleKey}'`);
  }

  const baseRupees = cycle === 'ANNUAL' ? pricing.annual : pricing.monthly;
  const baseAmountPaise = baseRupees * 100;
  const taxAmountPaise = calculateTaxPaise(baseAmountPaise, taxRateBps);
  const totalAmountPaise = baseAmountPaise + taxAmountPaise;

  return {
    moduleKey,
    billingCycle: cycle,
    baseRupees,
    baseAmountPaise,
    taxRateBps,
    taxAmountPaise,
    totalAmountPaise,
    label: pricing.label,
  };
}

// ============================================================================
// 3. PAYMENT ORDER CREATION
// ============================================================================

/**
 * Creates a SubscriptionPayment record and associated Razorpay order.
 */
async function createSubscriptionPaymentOrder({
  instituteId,
  moduleKey,
  billingCycle = 'MONTHLY',
  requestedByEmail = null,
  notes = null,
}) {
  if (!instituteId) {
    throw new Error('Valid instituteId is required.');
  }

  const config = await getPaymentConfig();
  const pricing = calculateSubscriptionPricePaise(moduleKey, billingCycle, config.gstRateBps);

  const receiptNumber = `rcpt_sub_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const idempotencyKey = `idem_${instituteId}_${moduleKey}_${Date.now()}`;

  let gatewayOrderId;

  if (!config.isMockMode && config.rzpClient) {
    // Live / Sandbox Razorpay API call
    const order = await config.rzpClient.orders.create({
      amount: pricing.totalAmountPaise,
      currency: 'INR',
      receipt: receiptNumber,
      notes: {
        instituteId,
        moduleKey,
        billingCycle: pricing.billingCycle,
        baseAmountPaise: String(pricing.baseAmountPaise),
        taxAmountPaise: String(pricing.taxAmountPaise),
      },
    });
    gatewayOrderId = order.id;
  } else {
    // Controlled Test/Mock Mode Order Generation
    gatewayOrderId = `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // Insert internal pending payment ledger record
  const payment = await prisma.subscriptionPayment.create({
    data: {
      instituteId,
      moduleKey,
      billingCycle: pricing.billingCycle,
      baseAmountPaise: pricing.baseAmountPaise,
      taxAmountPaise: pricing.taxAmountPaise,
      totalAmountPaise: pricing.totalAmountPaise,
      currency: 'INR',
      gatewayProvider: 'RAZORPAY',
      gatewayOrderId,
      status: 'PENDING',
      receiptNumber,
      idempotencyKey,
      requestedByEmail,
      notes,
    },
  });

  return {
    ok: true,
    paymentRecordId: payment.id,
    orderId: gatewayOrderId,
    amountPaise: pricing.totalAmountPaise,
    baseAmountPaise: pricing.baseAmountPaise,
    taxAmountPaise: pricing.taxAmountPaise,
    taxRateBps: pricing.taxRateBps,
    currency: 'INR',
    keyId: config.key_id,
    moduleKey,
    moduleName: pricing.label,
    billingCycle: pricing.billingCycle,
    receiptNumber,
  };
}

// ============================================================================
// 4. CRYPTOGRAPHIC SIGNATURE VERIFICATION
// ============================================================================

/**
 * Validates Razorpay client-side signature: HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature, secret }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !secret) {
    return false;
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(razorpay_signature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Validates Razorpay webhook signature: HMAC-SHA256(rawBody, webhookSecret)
 */
function verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyBuffer)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// ============================================================================
// 5. ATOMIC SUBSCRIPTION ACTIVATION & INVOICE GENERATION
// ============================================================================

/**
 * Activates a standing subscription and generates an invoice within an atomic transaction.
 * Idempotent: safe against duplicate calls from webhook and client verify.
 */
async function activatePaidSubscription({
  paymentId,
  gatewayPaymentId,
  gatewaySignature = null,
  paymentMethod = 'upi',
  gatewayFeePaise = null,
  netSettledPaise = null,
}) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch current payment record
    const payment = await tx.subscriptionPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error(`Payment record '${paymentId}' not found.`);
    }

    // 2. Idempotency Check: If already processed and successful, return existing data
    if (payment.status === 'SUCCESS') {
      const existingSub = payment.subscriptionId
        ? await tx.collegeSubscription.findUnique({ where: { id: payment.subscriptionId } })
        : null;
      const existingInvoice = await tx.subscriptionInvoice.findUnique({ where: { paymentId } });
      return {
        alreadyProcessed: true,
        payment,
        subscription: existingSub,
        invoice: existingInvoice,
      };
    }

    // 3. Mark payment as SUCCESS
    const updatedPayment = await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        gatewayPaymentId,
        gatewaySignature,
        paymentMethod,
        gatewayFeePaise,
        netSettledPaise: netSettledPaise ?? (gatewayFeePaise ? payment.totalAmountPaise - gatewayFeePaise : null),
        paidAt: new Date(),
      },
    });

    // 4. Calculate validity & extension logic
    const durationDays = payment.billingCycle === 'ANNUAL' ? 365 : 30;
    const now = new Date();

    const existingSub = await tx.collegeSubscription.findUnique({
      where: {
        instituteId_moduleKey: {
          instituteId: payment.instituteId,
          moduleKey: payment.moduleKey,
        },
      },
    });

    let startsAt = now;
    let renewalDate;
    let action = 'ACTIVATED';

    if (existingSub && existingSub.status === 'ACTIVE' && existingSub.renewalDate && new Date(existingSub.renewalDate) > now) {
      // Annual / Monthly Renewal Extension from current renewal cutoff
      startsAt = existingSub.startsAt;
      renewalDate = new Date(new Date(existingSub.renewalDate).getTime() + durationDays * 24 * 60 * 60 * 1000);
      action = 'RENEWED';
    } else {
      // Fresh activation or reactivation of expired subscription
      startsAt = now;
      renewalDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      action = existingSub ? 'RENEWED' : 'ACTIVATED';
    }

    const priceRupeesSnapshot = Math.round(payment.baseAmountPaise / 100);

    // 5. Upsert standing CollegeSubscription record
    const subscription = await tx.collegeSubscription.upsert({
      where: {
        instituteId_moduleKey: {
          instituteId: payment.instituteId,
          moduleKey: payment.moduleKey,
        },
      },
      create: {
        instituteId: payment.instituteId,
        moduleKey: payment.moduleKey,
        status: 'ACTIVE',
        isActive: true,
        billingCycle: payment.billingCycle,
        priceRupeesSnapshot,
        startsAt,
        renewalDate,
        paymentMethod: 'ONLINE_RAZORPAY',
        paymentRef: gatewayPaymentId,
        note: `Online payment via Razorpay (${payment.billingCycle})`,
      },
      update: {
        status: 'ACTIVE',
        isActive: true,
        billingCycle: payment.billingCycle,
        priceRupeesSnapshot,
        startsAt,
        renewalDate,
        paymentMethod: 'ONLINE_RAZORPAY',
        paymentRef: gatewayPaymentId,
        note: `Online payment via Razorpay (${payment.billingCycle})`,
      },
    });

    // Link subscriptionId back to payment
    await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: { subscriptionId: subscription.id },
    });

    // 6. Record immutable SubscriptionHistory audit event
    await tx.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        instituteId: payment.instituteId,
        moduleKey: payment.moduleKey,
        action,
        billingCycle: payment.billingCycle,
        priceRupeesSnapshot,
        periodStart: startsAt,
        periodEnd: renewalDate,
        paymentMethod: 'ONLINE_RAZORPAY',
        paymentRef: gatewayPaymentId,
        performedByEmail: payment.requestedByEmail || 'system@razorpay',
        note: `Automated online payment capture (${payment.billingCycle}, ${payment.totalAmountPaise} paise)`,
      },
    });

    // 7. Generate sequential SubscriptionInvoice
    const config = await getPaymentConfig();
    const currentYear = now.getFullYear();
    const nextYearShort = String(currentYear + 1).slice(-2);
    const invoiceCount = await tx.subscriptionInvoice.count();
    const prefix = config.invoicePrefix || 'QS';
    const invoiceNumber = `${prefix}/${currentYear}-${nextYearShort}/INV-${String(invoiceCount + 1).padStart(5, '0')}`;

    const taxSplit = calculateTaxBreakdown(payment.baseAmountPaise, config.gstRateBps || 1800, false);

    const invoice = await tx.subscriptionInvoice.create({
      data: {
        invoiceNumber,
        instituteId: payment.instituteId,
        paymentId: payment.id,
        invoiceDate: now,
        baseAmountPaise: payment.baseAmountPaise,
        taxableAmountPaise: payment.baseAmountPaise,
        taxRateBps: config.gstRateBps || 1800,
        taxAmountPaise: payment.taxAmountPaise,
        cgstAmountPaise: taxSplit.cgstPaise,
        sgstAmountPaise: taxSplit.sgstPaise,
        igstAmountPaise: taxSplit.igstPaise,
        totalAmountPaise: payment.totalAmountPaise,
        status: 'PAID',
        sacCode: config.sacCode || '998313',
        pdfPath: `/invoices/${invoiceNumber.replace(/\//g, '_')}.pdf`,
      },
    });

    return {
      alreadyProcessed: false,
      payment: updatedPayment,
      subscription,
      invoice,
    };
  });

  // Asynchronous automated WhatsApp notifications for subscription activation
  if (!result.alreadyProcessed) {
    try {
      const inst = await prisma.institute.findUnique({
        where: { id: result.payment.instituteId },
        select: { id: true, name: true, phone: true, trialPhoneNumber: true },
      });
      const collegePhone = inst?.phone || inst?.trialPhoneNumber;
      const totalAmountRupees = Math.round(result.payment.totalAmountPaise / 100);

      if (collegePhone) {
        whatsappService.sendSubscriptionActivationNotification({
          collegePhone,
          collegeName: inst.name,
          moduleKey: result.payment.moduleKey,
          billingCycle: result.payment.billingCycle,
          totalAmountRupees,
          invoiceNumber: result.invoice.invoiceNumber,
          validUntil: result.subscription.renewalDate,
        }).catch(err => console.warn('[WHATSAPP] College subscription notification error:', err.message));
      }

      const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
      if (adminPhone) {
        whatsappService.sendAdminSubscriptionAlert({
          adminPhone,
          collegeName: inst?.name || 'A College',
          moduleKey: result.payment.moduleKey,
          billingCycle: result.payment.billingCycle,
          totalAmountRupees,
          invoiceNumber: result.invoice.invoiceNumber,
        }).catch(err => console.warn('[WHATSAPP] Admin subscription alert error:', err.message));
      }
    } catch (waErr) {
      console.warn('[WHATSAPP] Failed to queue subscription activation message:', waErr.message);
    }
  }

  return result;
}

// ============================================================================
// 6. WEBHOOK INGESTION & PROCESSING ENGINE
// ============================================================================

/**
 * Processes an incoming Razorpay webhook event with cryptographic HMAC verification and idempotency locks.
 */
async function processWebhookEvent({ eventId, eventType, payload, rawBody, signature }) {
  const config = await getPaymentConfig();

  // 1. Verify Webhook Signature using raw body buffer
  const isSignatureValid = verifyWebhookSignature({
    rawBody,
    signature,
    webhookSecret: config.webhook_secret,
  });

  if (!isSignatureValid) {
    throw new Error('INVALID_WEBHOOK_SIGNATURE: Cryptographic signature verification failed.');
  }

  // 2. Redact sensitive fields for PCI/privacy compliance
  const sanitizedPayload = typeof payload === 'string' ? JSON.parse(payload) : { ...payload };
  if (sanitizedPayload.payload?.payment?.entity?.card) {
    sanitizedPayload.payload.payment.entity.card = { redacted: true };
  }
  const payloadString = JSON.stringify(sanitizedPayload);

  // 3. Idempotency Check on Event ID
  const existingLog = await prisma.paymentWebhookLog.findUnique({
    where: { eventId },
  });

  if (existingLog && existingLog.processingStatus === 'PROCESSED') {
    return {
      ok: true,
      alreadyProcessed: true,
      message: `Webhook event '${eventId}' was already processed.`,
    };
  }

  // 4. Create or update Webhook Ingestion Log
  let logRecord;
  if (!existingLog) {
    logRecord = await prisma.paymentWebhookLog.create({
      data: {
        gatewayProvider: 'RAZORPAY',
        eventId,
        eventType,
        gatewayOrderId: sanitizedPayload.payload?.payment?.entity?.order_id || sanitizedPayload.payload?.order?.entity?.id || null,
        gatewayPaymentId: sanitizedPayload.payload?.payment?.entity?.id || null,
        processingStatus: 'RECEIVED',
        payload: payloadString,
      },
    });
  } else {
    logRecord = existingLog;
  }

  try {
    // 5. Handle Event Dispatch
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = sanitizedPayload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount;
      const currency = paymentEntity?.currency;
      const method = paymentEntity?.method || 'unknown';

      if (!orderId) {
        throw new Error('Event missing order_id.');
      }

      // Find internal payment
      const payment = await prisma.subscriptionPayment.findUnique({
        where: { gatewayOrderId: orderId },
      });

      if (!payment) {
        throw new Error(`No SubscriptionPayment found for order_id '${orderId}'.`);
      }

      // Verify amounts and currency match
      if (payment.totalAmountPaise !== amountPaise) {
        throw new Error(`Amount mismatch: expected ${payment.totalAmountPaise} paise, received ${amountPaise} paise.`);
      }
      if (currency && currency !== 'INR') {
        throw new Error(`Currency mismatch: expected INR, received ${currency}.`);
      }

      // Atomic activation
      const result = await activatePaidSubscription({
        paymentId: payment.id,
        gatewayPaymentId: paymentId,
        paymentMethod: method,
      });

      // Mark webhook log PROCESSED
      await prisma.paymentWebhookLog.update({
        where: { id: logRecord.id },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return {
        ok: true,
        action: 'ACTIVATED',
        result,
      };
    } else if (eventType === 'payment.failed') {
      const paymentEntity = sanitizedPayload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const errorDesc = paymentEntity?.error_description || 'Payment failed at gateway';

      if (orderId) {
        await prisma.subscriptionPayment.updateMany({
          where: { gatewayOrderId: orderId, status: 'PENDING' },
          data: {
            status: 'FAILED',
            failureReason: errorDesc,
          },
        });
      }

      await prisma.paymentWebhookLog.update({
        where: { id: logRecord.id },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
          errorDetails: errorDesc,
        },
      });

      return {
        ok: true,
        action: 'MARKED_FAILED',
        error: errorDesc,
      };
    } else if (eventType === 'refund.processed') {
      const refundEntity = sanitizedPayload.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const refundId = refundEntity?.id;
      const refundAmount = refundEntity?.amount;

      if (paymentId) {
        const payment = await prisma.subscriptionPayment.findUnique({
          where: { gatewayPaymentId: paymentId },
          include: { invoice: true },
        });

        if (payment && payment.status !== 'REFUNDED') {
          await prisma.$transaction(async (tx) => {
            await tx.subscriptionPayment.update({
              where: { id: payment.id },
              data: {
                status: 'REFUNDED',
                refundReference: refundId || `rfnd_auto_${Date.now()}`,
                refundStatus: 'PROCESSED',
                refundAmountPaise: refundAmount || payment.totalAmountPaise,
                refundedAt: new Date(),
              },
            });

            if (payment.invoice) {
              await tx.subscriptionInvoice.update({
                where: { id: payment.invoice.id },
                data: { status: 'REFUNDED' },
              });
            }

            if (payment.subscriptionId) {
              await tx.collegeSubscription.update({
                where: { id: payment.subscriptionId },
                data: { status: 'CANCELLED', isActive: false },
              });
            }
          });
        }
      }

      await prisma.paymentWebhookLog.update({
        where: { id: logRecord.id },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return {
        ok: true,
        action: 'REFUND_PROCESSED',
      };
    } else if (eventType === 'refund.failed') {
      const refundEntity = sanitizedPayload.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const errorDesc = refundEntity?.error_description || 'Refund failed at gateway';

      if (paymentId) {
        await prisma.subscriptionPayment.updateMany({
          where: { gatewayPaymentId: paymentId },
          data: {
            refundStatus: 'FAILED',
            failureReason: errorDesc,
          },
        });
      }

      await prisma.paymentWebhookLog.update({
        where: { id: logRecord.id },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
          errorDetails: errorDesc,
        },
      });

      return {
        ok: true,
        action: 'REFUND_FAILED',
        error: errorDesc,
      };
    } else {
      // Other unhandled events
      await prisma.paymentWebhookLog.update({
        where: { id: logRecord.id },
        data: {
          processingStatus: 'IGNORED',
          processedAt: new Date(),
        },
      });

      return {
        ok: true,
        action: 'IGNORED',
        eventType,
      };
    }
  } catch (err) {
    // Record error in webhook log
    await prisma.paymentWebhookLog.update({
      where: { id: logRecord.id },
      data: {
        processingStatus: 'FAILED',
        errorDetails: err.message,
      },
    });
    throw err;
  }
}

// ============================================================================
// 7. OFFLINE MANUAL PAYMENT RECORDING & REFUND ENGINES
// ============================================================================

/**
 * Records a verified manual/offline institutional payment (NEFT/RTGS/Cheque/Bank Transfer).
 * Unlocks subscription access, generates an official GST Tax Invoice, and records collected revenue.
 */
async function recordOfflineVerifiedPayment({
  instituteId,
  moduleKey,
  billingCycle = 'MONTHLY',
  paymentMethod = 'NEFT_RTGS',
  paymentRef,
  paymentDate = null,
  notes = null,
  adminEmail = 'admin@questionstudio.com',
  subscriptionId = null,
}) {
  if (!instituteId) throw new Error('instituteId is required to record offline payment.');
  if (!moduleKey || !MODULE_KEYS[moduleKey]) {
    throw new Error(`Invalid moduleKey '${moduleKey}'. Valid keys: ${Object.keys(MODULE_KEYS).join(', ')}`);
  }
  if (!paymentRef || !paymentRef.trim()) {
    throw new Error('UTR / Transaction reference is required to verify offline payment.');
  }

  const config = await getPaymentConfig();
  const pricing = calculateSubscriptionPricePaise(moduleKey, billingCycle, config.gstRateBps);
  const now = paymentDate ? new Date(paymentDate) : new Date();
  const receiptNumber = `rcpt_off_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const gatewayOrderId = `order_off_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const idempotencyKey = `idem_off_${instituteId}_${moduleKey}_${Date.now()}`;

  const durationDays = pricing.billingCycle === 'ANNUAL' ? 365 : 30;

  return prisma.$transaction(async (tx) => {
    // 1. Check existing subscription for validity extension
    const existingSub = await tx.collegeSubscription.findUnique({
      where: {
        instituteId_moduleKey: {
          instituteId,
          moduleKey,
        },
      },
    });

    let startsAt = now;
    let renewalDate;
    let action = 'ACTIVATED';

    if (existingSub && existingSub.status === 'ACTIVE' && existingSub.renewalDate && new Date(existingSub.renewalDate) > now) {
      startsAt = existingSub.startsAt;
      renewalDate = new Date(new Date(existingSub.renewalDate).getTime() + durationDays * 24 * 60 * 60 * 1000);
      action = 'RENEWED';
    } else {
      startsAt = now;
      renewalDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      action = existingSub ? 'RENEWED' : 'ACTIVATED';
    }

    const priceRupeesSnapshot = Math.round(pricing.baseAmountPaise / 100);

    // 2. Create the SUCCESS SubscriptionPayment ledger record
    const payment = await tx.subscriptionPayment.create({
      data: {
        instituteId,
        moduleKey,
        billingCycle: pricing.billingCycle,
        baseAmountPaise: pricing.baseAmountPaise,
        taxAmountPaise: pricing.taxAmountPaise,
        totalAmountPaise: pricing.totalAmountPaise,
        currency: 'INR',
        gatewayProvider: 'OFFLINE_MANUAL',
        gatewayOrderId,
        gatewayPaymentId: paymentRef.trim(),
        paymentMethod: paymentMethod || 'NEFT_RTGS',
        gatewayFeePaise: 0,
        netSettledPaise: pricing.totalAmountPaise,
        status: 'SUCCESS',
        paidAt: now,
        receiptNumber,
        idempotencyKey,
        requestedByEmail: adminEmail,
        notes: notes ? `Verified Offline Payment: ${notes}` : 'Verified manual institutional payment by Super Admin',
      },
    });

    // 3. Upsert standing CollegeSubscription record to ACTIVE
    const subscription = await tx.collegeSubscription.upsert({
      where: {
        instituteId_moduleKey: {
          instituteId,
          moduleKey,
        },
      },
      create: {
        instituteId,
        moduleKey,
        status: 'ACTIVE',
        isActive: true,
        billingCycle: pricing.billingCycle,
        priceRupeesSnapshot,
        startsAt,
        renewalDate,
        paymentMethod: paymentMethod || 'OFFLINE_MANUAL',
        paymentRef: paymentRef.trim(),
        activatedByEmail: adminEmail,
        note: `Offline payment verified: ${paymentRef.trim()} (${pricing.billingCycle})`,
      },
      update: {
        status: 'ACTIVE',
        isActive: true,
        billingCycle: pricing.billingCycle,
        priceRupeesSnapshot,
        startsAt,
        renewalDate,
        paymentMethod: paymentMethod || 'OFFLINE_MANUAL',
        paymentRef: paymentRef.trim(),
        activatedByEmail: adminEmail,
        note: `Offline payment verified: ${paymentRef.trim()} (${pricing.billingCycle})`,
      },
    });

    // Link subscriptionId back to payment
    await tx.subscriptionPayment.update({
      where: { id: payment.id },
      data: { subscriptionId: subscription.id },
    });

    // 4. Record immutable SubscriptionHistory audit entry
    await tx.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        instituteId,
        moduleKey,
        action: 'OFFLINE_PAID',
        billingCycle: pricing.billingCycle,
        priceRupeesSnapshot,
        periodStart: startsAt,
        periodEnd: renewalDate,
        paymentMethod: paymentMethod || 'OFFLINE_MANUAL',
        paymentRef: paymentRef.trim(),
        performedByEmail: adminEmail,
        note: `Verified manual payment of ₹${Math.round(pricing.totalAmountPaise / 100)} (Ref: ${paymentRef.trim()})`,
      },
    });

    // 5. Generate sequential SubscriptionInvoice
    const currentYear = now.getFullYear();
    const nextYearShort = String(currentYear + 1).slice(-2);
    const invoiceCount = await tx.subscriptionInvoice.count();
    const prefix = config.invoicePrefix || 'QS';
    const invoiceNumber = `${prefix}/${currentYear}-${nextYearShort}/INV-${String(invoiceCount + 1).padStart(5, '0')}`;

    const taxSplit = calculateTaxBreakdown(pricing.baseAmountPaise, config.gstRateBps || 1800, false);

    const invoice = await tx.subscriptionInvoice.create({
      data: {
        invoiceNumber,
        instituteId,
        paymentId: payment.id,
        invoiceDate: now,
        baseAmountPaise: pricing.baseAmountPaise,
        taxableAmountPaise: pricing.baseAmountPaise,
        taxRateBps: config.gstRateBps || 1800,
        taxAmountPaise: pricing.taxAmountPaise,
        cgstAmountPaise: taxSplit.cgstPaise,
        sgstAmountPaise: taxSplit.sgstPaise,
        igstAmountPaise: taxSplit.igstPaise,
        totalAmountPaise: pricing.totalAmountPaise,
        status: 'PAID',
        sacCode: config.sacCode || '998313',
        billingAddress: config.sellerAddress || 'Hyderabad, Telangana, India',
        pdfPath: `/invoices/${invoiceNumber.replace(/\//g, '_')}.pdf`,
      },
    });

    return {
      payment,
      subscription,
      invoice,
    };
  });
}

/**
 * Processes a refund for a previously captured subscription payment.
 * Prevents duplicate refunds, updates payment and invoice status, and optionally deactivates subscription.
 */
async function processPaymentRefund({
  paymentId,
  refundReference,
  refundAmountPaise = null,
  reason = null,
  adminEmail = 'admin@questionstudio.com',
  deactivateSubscription = true,
}) {
  if (!paymentId) throw new Error('paymentId is required for refund.');
  if (!refundReference || !refundReference.trim()) {
    throw new Error('refundReference is required for refund audit trail.');
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { invoice: true, subscription: true },
    });

    if (!payment) {
      throw new Error(`Payment record '${paymentId}' not found.`);
    }

    if (payment.status === 'REFUNDED') {
      throw new Error(`DUPLICATE_REFUND: Payment '${paymentId}' has already been refunded.`);
    }

    if (payment.status !== 'SUCCESS') {
      throw new Error(`Cannot refund payment with status '${payment.status}'. Only SUCCESS payments can be refunded.`);
    }

    const requestedAmount = refundAmountPaise !== null && refundAmountPaise !== undefined
      ? parseInt(refundAmountPaise, 10)
      : payment.totalAmountPaise;

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      throw new Error('Refund amount must be a positive integer in paise.');
    }

    if (requestedAmount > payment.totalAmountPaise) {
      throw new Error(`Refund amount (${requestedAmount} paise) cannot exceed total paid amount (${payment.totalAmountPaise} paise).`);
    }

    const now = new Date();

    const config = await getPaymentConfig();
    let verifiedRefundRef = refundReference ? refundReference.trim() : null;
    let verifiedRefundStatus = 'PROCESSED';

    // If online Razorpay payment with active SDK client, call gateway refund endpoint
    if (payment.gatewayProvider === 'RAZORPAY' && payment.gatewayPaymentId && !config.isMockMode && config.rzpClient) {
      try {
        const rzpRefund = await config.rzpClient.payments.refund(payment.gatewayPaymentId, {
          amount: requestedAmount,
          notes: {
            reason: reason || 'Subscription refund processed by Super Admin',
            instituteId: payment.instituteId,
            moduleKey: payment.moduleKey,
          },
        });
        verifiedRefundRef = rzpRefund.id;
        verifiedRefundStatus = (rzpRefund.status || 'PROCESSED').toUpperCase();
      } catch (rzpErr) {
        console.error('Razorpay Gateway Refund Error:', rzpErr);
        throw new Error(`GATEWAY_REFUND_FAILED: Gateway rejected refund: ${rzpErr.message || 'Unknown error'}`);
      }
    } else if (!verifiedRefundRef) {
      verifiedRefundRef = `rfnd_rec_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    }

    // 1. Update payment status to REFUNDED
    const updatedPayment = await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundReference: verifiedRefundRef,
        refundStatus: verifiedRefundStatus,
        refundAmountPaise: requestedAmount,
        refundedAt: now,
        notes: payment.notes ? `${payment.notes} | Refund: ${reason || 'Admin refund'}` : `Refund: ${reason || 'Admin refund'}`,
      },
    });

    // 2. Update linked invoice to REFUNDED
    let updatedInvoice = null;
    if (payment.invoice) {
      updatedInvoice = await tx.subscriptionInvoice.update({
        where: { id: payment.invoice.id },
        data: {
          status: 'REFUNDED',
        },
      });
    }

    // 3. Deactivate or cancel linked subscription if requested
    let updatedSubscription = null;
    if (deactivateSubscription && payment.subscriptionId) {
      updatedSubscription = await tx.collegeSubscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: 'CANCELLED',
          isActive: false,
          note: `Revoked due to refund: ${refundReference.trim()} (${reason || 'Super Admin refund'})`,
        },
      });

      // Audit entry in SubscriptionHistory
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: payment.subscriptionId,
          instituteId: payment.instituteId,
          moduleKey: payment.moduleKey,
          action: 'REFUNDED',
          billingCycle: payment.billingCycle,
          priceRupeesSnapshot: Math.round(payment.baseAmountPaise / 100),
          periodStart: payment.subscription?.startsAt || now,
          periodEnd: now,
          paymentMethod: payment.paymentMethod,
          paymentRef: refundReference.trim(),
          performedByEmail: adminEmail,
          note: `Refund of ₹${Math.round(requestedAmount / 100)} processed. Subscription access revoked. Reason: ${reason || 'Admin processed refund'}`,
        },
      });
    }

    return {
      ok: true,
      payment: updatedPayment,
      invoice: updatedInvoice,
      subscription: updatedSubscription,
    };
  });
}

module.exports = {
  getPaymentConfig,
  calculateTaxPaise,
  calculateIntraStateTaxSplit,
  calculateTaxBreakdown,
  calculateSubscriptionPricePaise,
  createSubscriptionPaymentOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  activatePaidSubscription,
  processWebhookEvent,
  recordOfflineVerifiedPayment,
  processPaymentRefund,
};
