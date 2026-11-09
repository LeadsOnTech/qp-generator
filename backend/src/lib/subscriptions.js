const prisma = require('../db');

const MODULE_KEYS = {
  OMR: 'OMR',
  CBT: 'CBT',
  COLLEGE_WEBSITE: 'COLLEGE_WEBSITE',
  WHATSAPP: 'WHATSAPP',
  COMPLETE_BUNDLE: 'COMPLETE_BUNDLE',
};

const MODULE_PRICING = {
  OMR: { monthly: 999, annual: 9990, label: 'OMR & Answer Key Generator' },
  CBT: { monthly: 1999, annual: 19990, label: 'Online Examination (CBT)' },
  COLLEGE_WEBSITE: { monthly: 1499, annual: 14990, label: 'Dynamic College Website' },
  WHATSAPP: { monthly: 499, annual: 4990, label: 'WhatsApp Automation' },
  COMPLETE_BUNDLE: { monthly: 4499, annual: 44990, label: 'Complete Add-on Bundle' },
};

const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  SUSPENDED: 'SUSPENDED',
};

/**
 * Checks whether an institute has active, valid access to a specific module.
 * An active COMPLETE_BUNDLE grants access to all 4 optional modules:
 * OMR, CBT, COLLEGE_WEBSITE, WHATSAPP.
 * 
 * Expired, cancelled, suspended, or pending subscriptions do not grant access.
 */
async function checkModuleAccess(instituteId, moduleKey) {
  if (!instituteId) {
    return { hasAccess: false, reason: 'NO_INSTITUTE', moduleKey };
  }

  // Eligible module keys: the requested module itself, OR the complete bundle
  const eligibleKeys = [moduleKey];
  if (moduleKey !== MODULE_KEYS.COMPLETE_BUNDLE) {
    eligibleKeys.push(MODULE_KEYS.COMPLETE_BUNDLE);
  }

  const subscriptions = await prisma.collegeSubscription.findMany({
    where: {
      instituteId,
      moduleKey: { in: eligibleKeys },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscriptions || subscriptions.length === 0) {
    return {
      hasAccess: false,
      reason: 'NOT_SUBSCRIBED',
      moduleKey,
    };
  }

  const now = new Date();

  // Inspect each subscription matching the module or bundle
  for (const sub of subscriptions) {
    // 1. Must be marked isActive
    if (!sub.isActive) {
      continue;
    }

    // 2. Must have status ACTIVE
    if (sub.status !== SUBSCRIPTION_STATUSES.ACTIVE) {
      continue;
    }

    // 3. Verify start date
    if (sub.startsAt && new Date(sub.startsAt) > now) {
      // Future subscription not yet started
      continue;
    }

    // 4. Verify expiration date / renewal cutoff
    // If expiresAt is set, it serves as the hard cutoff
    if (sub.expiresAt && now > new Date(sub.expiresAt)) {
      continue;
    }

    // If no expiresAt is set, check renewalDate
    if (!sub.expiresAt && sub.renewalDate && now > new Date(sub.renewalDate)) {
      continue;
    }

    // Valid and active!
    return {
      hasAccess: true,
      subscription: sub,
      source: sub.moduleKey === MODULE_KEYS.COMPLETE_BUNDLE ? 'COMPLETE_BUNDLE' : 'DIRECT',
      moduleKey,
      grantedBy: sub.moduleKey,
      renewalDate: sub.renewalDate,
      expiresAt: sub.expiresAt,
    };
  }

  // If subscriptions exist but none passed the active validity checks:
  const latestSub = subscriptions[0];
  let reason = 'INACTIVE';
  if (
    latestSub.status === SUBSCRIPTION_STATUSES.EXPIRED ||
    (latestSub.expiresAt && now > new Date(latestSub.expiresAt)) ||
    (latestSub.renewalDate && now > new Date(latestSub.renewalDate))
  ) {
    reason = 'EXPIRED';
  } else if (latestSub.status === SUBSCRIPTION_STATUSES.SUSPENDED) {
    reason = 'SUSPENDED';
  } else if (latestSub.status === SUBSCRIPTION_STATUSES.CANCELLED) {
    reason = 'CANCELLED';
  } else if (latestSub.status === SUBSCRIPTION_STATUSES.PENDING_VERIFICATION) {
    reason = 'PENDING_VERIFICATION';
  }

  return {
    hasAccess: false,
    reason,
    moduleKey,
    lastSubscription: latestSub,
  };
}

/**
 * Returns complete module access map and active subscriptions for an institute.
 */
async function getInstituteModuleAccess(instituteId) {
  if (!instituteId) {
    return {
      OMR: false,
      CBT: false,
      COLLEGE_WEBSITE: false,
      WHATSAPP: false,
      COMPLETE_BUNDLE: false,
      hasBundle: false,
      activeModules: [],
      inactiveModules: [
        MODULE_KEYS.OMR,
        MODULE_KEYS.CBT,
        MODULE_KEYS.COLLEGE_WEBSITE,
        MODULE_KEYS.WHATSAPP,
      ],
      subscriptions: [],
      history: [],
    };
  }

  const [allSubscriptions, history] = await Promise.all([
    prisma.collegeSubscription.findMany({
      where: { instituteId },
      include: {
        history: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscriptionHistory.findMany({
      where: { instituteId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const [omrAccess, cbtAccess, webAccess, waAccess, bundleAccess] = await Promise.all([
    checkModuleAccess(instituteId, MODULE_KEYS.OMR),
    checkModuleAccess(instituteId, MODULE_KEYS.CBT),
    checkModuleAccess(instituteId, MODULE_KEYS.COLLEGE_WEBSITE),
    checkModuleAccess(instituteId, MODULE_KEYS.WHATSAPP),
    checkModuleAccess(instituteId, MODULE_KEYS.COMPLETE_BUNDLE),
  ]);

  const accessMap = {
    OMR: omrAccess.hasAccess,
    CBT: cbtAccess.hasAccess,
    COLLEGE_WEBSITE: webAccess.hasAccess,
    WHATSAPP: waAccess.hasAccess,
    COMPLETE_BUNDLE: bundleAccess.hasAccess,
  };

  const activeModules = Object.keys(accessMap).filter((k) => accessMap[k]);
  const optionalModules = [
    MODULE_KEYS.OMR,
    MODULE_KEYS.CBT,
    MODULE_KEYS.COLLEGE_WEBSITE,
    MODULE_KEYS.WHATSAPP,
  ];
  const inactiveModules = optionalModules.filter((k) => !accessMap[k]);

  return {
    instituteId,
    access: accessMap,
    hasBundle: bundleAccess.hasAccess,
    activeModules,
    inactiveModules,
    subscriptions: allSubscriptions,
    history: history || [],
    details: {
      OMR: omrAccess,
      CBT: cbtAccess,
      COLLEGE_WEBSITE: webAccess,
      WHATSAPP: waAccess,
    },
  };
}

/**
 * Express middleware to enforce module subscription access.
 * Super Admin accounts bypass module gating.
 * Institutes must have an active subscription for the specific module or COMPLETE_BUNDLE.
 */
function requireModuleAccess(moduleKey) {
  return async (req, res, next) => {
    try {
      // 1. Super Admin bypass (Platform Owner)
      if (req.user && req.user.role === 'ADMIN') {
        return next();
      }

      // 2. Securely resolve instituteId from token (or DB fallback for fresh user state)
      let instituteId = req.user?.instituteId;
      if (!instituteId && req.user?.userId) {
        const user = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { instituteId: true },
        });
        instituteId = user?.instituteId || null;
        if (instituteId && req.user) req.user.instituteId = instituteId;
      }

      if (!instituteId) {
        return res.status(403).json({
          error: 'An active institutional account is required to access this feature.',
          code: 'INSTITUTE_REQUIRED',
        });
      }

      // 3. Verify module access
      const access = await checkModuleAccess(instituteId, moduleKey);
      if (access.hasAccess) {
        req.subscriptionAccess = access;
        return next();
      }

      // 4. Access Denied: structured response with upgrade/activation info
      const pricing = MODULE_PRICING[moduleKey] || {};
      return res.status(403).json({
        error: `Access to ${pricing.label || moduleKey} is not active for your institution.`,
        code: 'MODULE_SUBSCRIPTION_REQUIRED',
        moduleKey,
        moduleName: pricing.label,
        monthlyPriceRupees: pricing.monthly,
        bundlePriceRupees: MODULE_PRICING.COMPLETE_BUNDLE.monthly,
        reason: access.reason,
      });
    } catch (err) {
      console.error(`[MODULE ACCESS MIDDLEWARE ERROR] moduleKey=${moduleKey}:`, err);
      return res.status(500).json({ error: 'Internal subscription verification error' });
    }
  };
}

/**
 * Service function: Activate or renew a module subscription for an institute.
 * Creates/updates CollegeSubscription and appends to SubscriptionHistory.
 */
async function activateSubscription({
  instituteId,
  moduleKey,
  billingCycle = 'MONTHLY',
  priceRupeesSnapshot,
  durationDays = 30,
  paymentMethod = 'MANUAL_UPI',
  paymentRef = null,
  activatedByEmail = null,
  note = null,
  action = 'ACTIVATED',
}) {
  const now = new Date();
  const renewalDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(renewalDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2-day grace period

  const defaultPrice = billingCycle === 'ANNUAL'
    ? (MODULE_PRICING[moduleKey]?.annual || 0)
    : (MODULE_PRICING[moduleKey]?.monthly || 0);
  const snapshot = typeof priceRupeesSnapshot === 'number' ? priceRupeesSnapshot : defaultPrice;

  return await prisma.$transaction(async (tx) => {
    // 1. Upsert subscription record
    const sub = await tx.collegeSubscription.upsert({
      where: {
        instituteId_moduleKey: {
          instituteId,
          moduleKey,
        },
      },
      create: {
        instituteId,
        moduleKey,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        isActive: true,
        billingCycle,
        priceRupeesSnapshot: snapshot,
        startsAt: now,
        renewalDate,
        expiresAt,
        paymentMethod,
        paymentRef,
        activatedByEmail,
        note,
      },
      update: {
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        isActive: true,
        billingCycle,
        priceRupeesSnapshot: snapshot,
        startsAt: now,
        renewalDate,
        expiresAt,
        paymentMethod,
        paymentRef,
        activatedByEmail,
        note,
      },
    });

    // 2. Record immutable history ledger
    const history = await tx.subscriptionHistory.create({
      data: {
        subscriptionId: sub.id,
        instituteId,
        moduleKey,
        action: action || 'ACTIVATED',
        billingCycle,
        priceRupeesSnapshot: snapshot,
        periodStart: now,
        periodEnd: renewalDate,
        paymentMethod,
        paymentRef,
        performedByEmail: activatedByEmail,
        note,
      },
    });

    return { subscription: sub, history };
  });
}

/**
 * Service function: College Admin requests activation of an optional module or bundle.
 * Status is set to PENDING_VERIFICATION and isActive is strictly false.
 * NEVER grants access until Super Admin approves.
 */
async function requestSubscription({
  instituteId,
  moduleKey,
  billingCycle = 'MONTHLY',
  paymentMethod = 'MANUAL_UPI',
  paymentRef = null,
  requestedByEmail = null,
  note = null,
}) {
  if (!instituteId) {
    throw new Error('instituteId is required to request subscription');
  }
  if (!MODULE_KEYS[moduleKey]) {
    throw new Error(`Invalid moduleKey '${moduleKey}'. Must be one of: ${Object.keys(MODULE_KEYS).join(', ')}`);
  }

  const cycle = (billingCycle || 'MONTHLY').toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
  const defaultPrice = cycle === 'ANNUAL'
    ? (MODULE_PRICING[moduleKey]?.annual || 0)
    : (MODULE_PRICING[moduleKey]?.monthly || 0);

  const durationDays = cycle === 'ANNUAL' ? 365 : 30;
  const now = new Date();
  const renewalDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(renewalDate.getTime() + 2 * 24 * 60 * 60 * 1000);

  return await prisma.$transaction(async (tx) => {
    const sub = await tx.collegeSubscription.upsert({
      where: {
        instituteId_moduleKey: {
          instituteId,
          moduleKey,
        },
      },
      create: {
        instituteId,
        moduleKey,
        status: SUBSCRIPTION_STATUSES.PENDING_VERIFICATION,
        isActive: false, // Strict: Never grant access while pending
        billingCycle: cycle,
        priceRupeesSnapshot: defaultPrice,
        startsAt: now,
        renewalDate,
        expiresAt,
        paymentMethod,
        paymentRef,
        activatedByEmail: null,
        note: note ? `Pending request: ${note}` : 'Requested by College Admin',
      },
      update: {
        status: SUBSCRIPTION_STATUSES.PENDING_VERIFICATION,
        isActive: false, // Strict: Never grant access while pending
        billingCycle: cycle,
        priceRupeesSnapshot: defaultPrice,
        startsAt: now,
        renewalDate,
        expiresAt,
        paymentMethod,
        paymentRef,
        activatedByEmail: null,
        note: note ? `Pending request: ${note}` : 'Requested by College Admin',
      },
    });

    const history = await tx.subscriptionHistory.create({
      data: {
        subscriptionId: sub.id,
        instituteId,
        moduleKey,
        action: 'REQUESTED',
        billingCycle: cycle,
        priceRupeesSnapshot: defaultPrice,
        periodStart: now,
        periodEnd: renewalDate,
        paymentMethod,
        paymentRef,
        performedByEmail: requestedByEmail,
        note: note || 'College Admin submitted subscription request',
      },
    });

    return { subscription: sub, history };
  });
}

/**
 * Service function: College Admin requests cancellation of a subscription.
 * Records the request in history and flags the subscription notes for Super Admin.
 */
async function requestSubscriptionCancellation({
  instituteId,
  moduleKey,
  requestedByEmail = null,
  reason = null,
}) {
  if (!instituteId || !moduleKey) {
    throw new Error('instituteId and moduleKey are required');
  }

  const existing = await prisma.collegeSubscription.findUnique({
    where: {
      instituteId_moduleKey: {
        instituteId,
        moduleKey,
      },
    },
  });

  if (!existing) {
    throw new Error(`No subscription found for module '${moduleKey}'`);
  }

  const noteAppend = reason ? `[Cancellation Requested: ${reason}]` : '[Cancellation Requested by College]';

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.collegeSubscription.update({
      where: { id: existing.id },
      data: {
        note: existing.note ? `${existing.note} | ${noteAppend}` : noteAppend,
      },
    });

    const history = await tx.subscriptionHistory.create({
      data: {
        subscriptionId: existing.id,
        instituteId,
        moduleKey,
        action: 'CANCEL_REQUESTED',
        billingCycle: existing.billingCycle,
        priceRupeesSnapshot: existing.priceRupeesSnapshot,
        periodStart: existing.startsAt,
        periodEnd: existing.renewalDate,
        paymentMethod: existing.paymentMethod,
        paymentRef: existing.paymentRef,
        performedByEmail: requestedByEmail,
        note: reason || 'Cancellation requested by college admin',
      },
    });

    return { subscription: updated, history };
  });
}

/**
 * Service function: Super Admin renews an active or expired subscription.
 */
async function renewSubscription({
  instituteId,
  moduleKey,
  durationDays,
  billingCycle,
  priceRupeesSnapshot,
  paymentMethod = 'MANUAL_UPI',
  paymentRef = null,
  renewedByEmail = null,
  note = null,
}) {
  if (!instituteId || !moduleKey) {
    throw new Error('instituteId and moduleKey are required to renew');
  }

  const existing = await prisma.collegeSubscription.findUnique({
    where: {
      instituteId_moduleKey: {
        instituteId,
        moduleKey,
      },
    },
  });

  if (!existing) {
    throw new Error(`No existing subscription found for module '${moduleKey}'`);
  }

  const now = new Date();
  const cycle = (billingCycle || existing.billingCycle || 'MONTHLY').toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
  const days = durationDays ? parseInt(durationDays, 10) : (cycle === 'ANNUAL' ? 365 : 30);

  // Extend from current renewal date if still in future; otherwise from now
  const startFrom = (existing.renewalDate && new Date(existing.renewalDate) > now)
    ? new Date(existing.renewalDate)
    : now;

  const newRenewalDate = new Date(startFrom.getTime() + days * 24 * 60 * 60 * 1000);
  const newExpiresAt = new Date(newRenewalDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2-day grace period

  const defaultPrice = cycle === 'ANNUAL'
    ? (MODULE_PRICING[moduleKey]?.annual || 0)
    : (MODULE_PRICING[moduleKey]?.monthly || 0);
  const snapshot = typeof priceRupeesSnapshot === 'number' ? priceRupeesSnapshot : defaultPrice;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.collegeSubscription.update({
      where: { id: existing.id },
      data: {
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        isActive: true,
        billingCycle: cycle,
        priceRupeesSnapshot: snapshot,
        renewalDate: newRenewalDate,
        expiresAt: newExpiresAt,
        paymentMethod: paymentMethod || existing.paymentMethod,
        paymentRef: paymentRef || existing.paymentRef,
        activatedByEmail: renewedByEmail,
        note: note ? `${existing.note || ''} | Renewal: ${note}` : existing.note,
      },
    });

    const history = await tx.subscriptionHistory.create({
      data: {
        subscriptionId: existing.id,
        instituteId,
        moduleKey,
        action: 'RENEWED',
        billingCycle: cycle,
        priceRupeesSnapshot: snapshot,
        periodStart: startFrom,
        periodEnd: newRenewalDate,
        paymentMethod: paymentMethod || existing.paymentMethod,
        paymentRef: paymentRef || existing.paymentRef,
        performedByEmail: renewedByEmail,
        note: note || `Subscription renewed for ${days} days`,
      },
    });

    return { subscription: updated, history };
  });
}

/**
 * Service function: Super Admin approves a pending subscription request.
 */
async function approveSubscription({
  subscriptionId = null,
  instituteId = null,
  moduleKey = null,
  durationDays = null,
  billingCycle = null,
  priceRupeesSnapshot,
  paymentMethod = 'MANUAL_UPI',
  paymentRef = null,
  approvedByEmail = null,
  note = null,
}) {
  let targetInstituteId = instituteId;
  let targetModuleKey = moduleKey;
  let targetBillingCycle = billingCycle;
  let targetPrice = priceRupeesSnapshot;

  if (subscriptionId) {
    const sub = await prisma.collegeSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) {
      throw new Error(`Subscription with ID '${subscriptionId}' not found`);
    }
    targetInstituteId = sub.instituteId;
    targetModuleKey = sub.moduleKey;
    targetBillingCycle = billingCycle || sub.billingCycle;
    if (targetPrice === undefined) targetPrice = sub.priceRupeesSnapshot;
  }

  if (!targetInstituteId || !targetModuleKey) {
    throw new Error('instituteId and moduleKey (or subscriptionId) are required to approve');
  }

  const cycle = (targetBillingCycle || 'MONTHLY').toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
  const days = durationDays ? parseInt(durationDays, 10) : (cycle === 'ANNUAL' ? 365 : 30);
  const defaultPrice = cycle === 'ANNUAL'
    ? (MODULE_PRICING[targetModuleKey]?.annual || 0)
    : (MODULE_PRICING[targetModuleKey]?.monthly || 0);
  const finalPrice = typeof targetPrice === 'number' ? targetPrice : defaultPrice;

  return await activateSubscription({
    instituteId: targetInstituteId,
    moduleKey: targetModuleKey,
    billingCycle: cycle,
    priceRupeesSnapshot: finalPrice,
    durationDays: days,
    paymentMethod,
    paymentRef,
    activatedByEmail: approvedByEmail,
    note: note ? `Approved: ${note}` : 'Approved by Super Admin',
    action: 'APPROVED',
  });
}

/**
 * Service function: Deactivate / suspend / cancel a subscription.
 */
async function setSubscriptionStatus({
  instituteId,
  moduleKey,
  status = 'SUSPENDED', // SUSPENDED | CANCELLED | EXPIRED | ACTIVE
  action = null,
  performedByEmail = null,
  note = null,
}) {
  const existing = await prisma.collegeSubscription.findUnique({
    where: {
      instituteId_moduleKey: {
        instituteId,
        moduleKey,
      },
    },
  });

  if (!existing) {
    throw new Error(`No subscription found for instituteId=${instituteId} and moduleKey=${moduleKey}`);
  }

  const now = new Date();
  const isActive = status === SUBSCRIPTION_STATUSES.ACTIVE;
  const updateData = {
    status,
    isActive,
    note: note ? `${existing.note || ''} | ${note}` : existing.note,
  };

  // If reactivating to ACTIVE, ensure renewalDate and expiresAt are in the future
  if (isActive) {
    if (!existing.renewalDate || new Date(existing.renewalDate) <= now) {
      const renewalDays = existing.billingCycle === 'ANNUAL' ? 365 : 30;
      const renewalDate = new Date(now.getTime() + renewalDays * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(renewalDate.getTime() + 2 * 24 * 60 * 60 * 1000);
      updateData.renewalDate = renewalDate;
      updateData.expiresAt = expiresAt;
    }
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.collegeSubscription.update({
      where: { id: existing.id },
      data: updateData,
    });

    const history = await tx.subscriptionHistory.create({
      data: {
        subscriptionId: existing.id,
        instituteId,
        moduleKey,
        action: action || status,
        billingCycle: existing.billingCycle,
        priceRupeesSnapshot: existing.priceRupeesSnapshot,
        periodStart: existing.startsAt,
        periodEnd: updateData.renewalDate || existing.renewalDate || now,
        paymentMethod: existing.paymentMethod,
        paymentRef: existing.paymentRef,
        performedByEmail,
        note: note || `Status changed to ${status}`,
      },
    });

    return { subscription: updated, history };
  });
}

module.exports = {
  MODULE_KEYS,
  MODULE_PRICING,
  SUBSCRIPTION_STATUSES,
  checkModuleAccess,
  getInstituteModuleAccess,
  requireModuleAccess,
  activateSubscription,
  requestSubscription,
  requestSubscriptionCancellation,
  renewSubscription,
  approveSubscription,
  setSubscriptionStatus,
};
