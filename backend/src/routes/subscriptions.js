const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('../lib/auth');
const {
  MODULE_KEYS,
  MODULE_PRICING,
  SUBSCRIPTION_STATUSES,
  getInstituteModuleAccess,
  activateSubscription,
  requestSubscription,
  requestSubscriptionCancellation,
  renewSubscription,
  approveSubscription,
  setSubscriptionStatus,
} = require('../lib/subscriptions');

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
// 1. COLLEGE ADMIN APIS (Strictly Scoped to Authenticated Tenant)
// ============================================================================

/**
 * GET /api/subscriptions/catalog
 * Public/authenticated: Returns available optional modules, monthly and annual prices.
 */
router.get('/catalog', (req, res) => {
  res.json({
    ok: true,
    modules: MODULE_PRICING,
    coreProduct: {
      name: 'Question Paper Generation',
      type: 'ONE_TIME_CREDIT_PACKAGES',
      lifetimeValidity: true,
      creditCostPerQuestion: 1,
      packages: [
        { name: 'Starter', priceRupees: 5000, credits: 5000 },
        { name: 'Growth', priceRupees: 10000, credits: 11500 },
        { name: 'Institution', priceRupees: 20000, credits: 25000 },
      ],
    },
  });
});

/**
 * GET /api/subscriptions/status
 * GET /api/subscriptions/my
 * Scoped to the authenticated college.
 * Returns current subscriptions, active and inactive modules, start and renewal dates.
 */
const handleCollegeStatus = async (req, res) => {
  try {
    let targetInstituteId = await resolveAuthInstituteId(req);

    // Super Admin can inspect any college by passing ?instituteId=
    if (req.user?.role === 'ADMIN' && req.query.instituteId) {
      targetInstituteId = req.query.instituteId;
    }

    if (!targetInstituteId) {
      return res.status(400).json({ error: 'No institute associated with this user session.' });
    }

    const accessProfile = await getInstituteModuleAccess(targetInstituteId);
    return res.json({
      ok: true,
      ...accessProfile,
    });
  } catch (err) {
    console.error('Failed to get subscription status:', err);
    return res.status(500).json({ error: 'Failed to retrieve subscription status: ' + err.message });
  }
};

router.get('/status', handleCollegeStatus);
router.get('/my', handleCollegeStatus);

/**
 * POST /api/subscriptions/request
 * College Admin requests activation of an optional module or the Complete Bundle.
 * Status is set to PENDING_VERIFICATION and isActive is strictly false.
 * NEVER grants access until Super Admin approves.
 */
router.post('/request', async (req, res) => {
  try {
    // 1. Derive instituteId exclusively from authenticated session (never trust req.body.instituteId)
    const instituteId = await resolveAuthInstituteId(req);
    if (!instituteId) {
      return res.status(403).json({
        error: 'An active institutional account is required to request subscriptions.',
      });
    }

    const {
      moduleKey,
      billingCycle = 'MONTHLY',
      paymentMethod = 'MANUAL_UPI',
      paymentRef = null,
      note = null,
    } = req.body;

    if (!moduleKey || !MODULE_KEYS[moduleKey]) {
      return res.status(400).json({
        error: `Invalid moduleKey '${moduleKey}'. Must be one of: ${Object.keys(MODULE_KEYS).join(', ')}`,
      });
    }

    const cycle = (billingCycle || 'MONTHLY').toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

    const result = await requestSubscription({
      instituteId,
      moduleKey,
      billingCycle: cycle,
      paymentMethod,
      paymentRef,
      requestedByEmail: req.user?.email || null,
      note,
    });

    return res.json({
      ok: true,
      message: `Subscription request for ${MODULE_PRICING[moduleKey]?.label || moduleKey} submitted successfully. It is pending Super Admin approval.`,
      ...result,
    });
  } catch (err) {
    console.error('College subscription request failed:', err);
    return res.status(500).json({ error: 'Subscription request failed: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/request-cancellation
 * College Admin requests cancellation of an active or pending subscription.
 */
router.post('/request-cancellation', async (req, res) => {
  try {
    const instituteId = await resolveAuthInstituteId(req);
    if (!instituteId) {
      return res.status(403).json({
        error: 'An active institutional account is required to cancel subscriptions.',
      });
    }

    const { moduleKey, reason = null } = req.body;
    if (!moduleKey || !MODULE_KEYS[moduleKey]) {
      return res.status(400).json({
        error: `Invalid moduleKey '${moduleKey}'. Must be one of: ${Object.keys(MODULE_KEYS).join(', ')}`,
      });
    }

    const result = await requestSubscriptionCancellation({
      instituteId,
      moduleKey,
      requestedByEmail: req.user?.email || null,
      reason,
    });

    return res.json({
      ok: true,
      message: `Cancellation request for ${moduleKey} recorded successfully. Super Admin has been notified.`,
      ...result,
    });
  } catch (err) {
    console.error('Cancellation request failed:', err);
    return res.status(500).json({ error: 'Cancellation request failed: ' + err.message });
  }
});

// ============================================================================
// 2. SUPER ADMIN APIS (Protected by requireAdmin)
// ============================================================================

/**
 * GET /api/subscriptions/admin/all
 * Super Admin only: View all college subscriptions with optional search & filters.
 * Query params: ?search= (name/code/id), ?status=, ?moduleKey=
 */
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { search, college, status, moduleKey } = req.query;
    const searchTerm = (search || college || '').trim();

    const whereClause = {};
    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm } },
        { slug: { contains: searchTerm } },
        { id: { contains: searchTerm } },
      ];
    }

    // Build sub-filter on subscriptions if status or moduleKey requested
    const subFilter = {};
    if (status) subFilter.status = status;
    if (moduleKey) subFilter.moduleKey = moduleKey;

    const institutes = await prisma.institute.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        slug: true,
        creditBalance: true,
        whatsAppWalletBalance: true,
        subscriptions: {
          where: Object.keys(subFilter).length > 0 ? subFilter : undefined,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Compute platform summary statistics across entire platform
    const allInstitutesForCounts = await prisma.institute.findMany({
      select: {
        id: true,
        subscriptions: true,
      },
    });

    const totalColleges = allInstitutesForCounts.length;
    let activeSubscriptionsCount = 0;
    let pendingRequestsCount = 0;
    let expiredSubscriptionsCount = 0;
    let suspendedSubscriptionsCount = 0;
    let cancelledSubscriptionsCount = 0;
    let totalMrr = 0;
    let activeSubscriptionValue = 0;
    let pendingSubscriptionValue = 0;
    let collectedRevenue = 0;

    allInstitutesForCounts.forEach((inst) => {
      (inst.subscriptions || []).forEach((sub) => {
        if (sub.status === 'ACTIVE' && sub.isActive) {
          activeSubscriptionsCount++;
          const monthlyEquiv = sub.billingCycle === 'ANNUAL'
            ? Math.round(sub.priceRupeesSnapshot / 12)
            : sub.priceRupeesSnapshot;
          totalMrr += monthlyEquiv;
          activeSubscriptionValue += sub.priceRupeesSnapshot || 0;
          collectedRevenue += sub.priceRupeesSnapshot || 0;
        } else if (sub.status === 'PENDING_VERIFICATION') {
          pendingRequestsCount++;
          pendingSubscriptionValue += sub.priceRupeesSnapshot || 0;
        } else if (sub.status === 'EXPIRED') {
          expiredSubscriptionsCount++;
        } else if (sub.status === 'SUSPENDED') {
          suspendedSubscriptionsCount++;
        } else if (sub.status === 'CANCELLED') {
          cancelledSubscriptionsCount++;
        }
      });
    });

    return res.json({
      ok: true,
      totalColleges,
      activeSubscriptionsCount,
      pendingRequestsCount,
      expiredSubscriptionsCount,
      suspendedSubscriptionsCount,
      cancelledSubscriptionsCount,
      totalMrr,
      activeSubscriptionValue,
      pendingSubscriptionValue,
      collectedRevenue,
      institutes,
    });
  } catch (err) {
    console.error('Admin subscriptions list failed:', err);
    return res.status(500).json({ error: 'Failed to list subscriptions: ' + err.message });
  }
});

/**
 * GET /api/subscriptions/admin/college/:instituteId
 * Super Admin only: View individual college subscription details, access profile, and audit history.
 */
router.get('/admin/college/:instituteId', requireAdmin, async (req, res) => {
  try {
    const { instituteId } = req.params;

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        creditBalance: true,
        whatsAppWalletBalance: true,
        createdAt: true,
      },
    });

    if (!institute) {
      return res.status(404).json({ error: 'College not found.' });
    }

    const [accessProfile, history] = await Promise.all([
      getInstituteModuleAccess(instituteId),
      prisma.subscriptionHistory.findMany({
        where: { instituteId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return res.json({
      ok: true,
      institute,
      accessProfile,
      subscriptions: accessProfile.subscriptions,
      history,
    });
  } catch (err) {
    console.error('Admin college subscription details failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve college subscriptions: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/admin/approve
 * Super Admin only: Approve a pending subscription request and activate it.
 */
router.post('/admin/approve', requireAdmin, async (req, res) => {
  try {
    const {
      subscriptionId,
      instituteId,
      moduleKey,
      durationDays,
      billingCycle,
      priceRupeesSnapshot,
      paymentRef,
      note,
    } = req.body;

    const result = await approveSubscription({
      subscriptionId,
      instituteId,
      moduleKey,
      durationDays,
      billingCycle,
      priceRupeesSnapshot,
      paymentRef,
      approvedByEmail: req.user?.email || 'admin@questionstudio.com',
      note,
    });

    return res.json({
      ok: true,
      message: `Successfully approved and activated subscription for ${result.subscription.moduleKey}`,
      ...result,
    });
  } catch (err) {
    console.error('Admin approve subscription failed:', err);
    return res.status(500).json({ error: 'Approval failed: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/admin/activate
 * Super Admin only: Manually activates or overrides a module or bundle for a college.
 */
router.post('/admin/activate', requireAdmin, async (req, res) => {
  try {
    const {
      instituteId,
      moduleKey,
      billingCycle = 'MONTHLY',
      priceRupeesSnapshot,
      durationDays = 30,
      paymentMethod = 'MANUAL_UPI',
      paymentRef,
      note,
    } = req.body;

    if (!instituteId) {
      return res.status(400).json({ error: 'instituteId is required' });
    }

    if (!moduleKey || !MODULE_KEYS[moduleKey]) {
      return res.status(400).json({
        error: `Invalid moduleKey '${moduleKey}'. Must be one of: ${Object.keys(MODULE_KEYS).join(', ')}`,
      });
    }

    const institute = await prisma.institute.findUnique({ where: { id: instituteId } });
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found.' });
    }

    const result = await activateSubscription({
      instituteId,
      moduleKey,
      billingCycle,
      priceRupeesSnapshot,
      durationDays: parseInt(durationDays, 10) || 30,
      paymentMethod,
      paymentRef,
      activatedByEmail: req.user?.email || 'admin@questionstudio.com',
      note,
      action: 'ACTIVATED',
    });

    return res.json({
      ok: true,
      message: `Successfully activated ${moduleKey} for ${institute.name}`,
      ...result,
    });
  } catch (err) {
    console.error('Admin subscription activation failed:', err);
    return res.status(500).json({ error: 'Activation failed: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/admin/renew
 * Super Admin only: Renews an existing subscription, extending from renewalDate if active.
 */
router.post('/admin/renew', requireAdmin, async (req, res) => {
  try {
    const {
      instituteId,
      moduleKey,
      durationDays,
      billingCycle,
      priceRupeesSnapshot,
      paymentRef,
      note,
    } = req.body;

    if (!instituteId || !moduleKey) {
      return res.status(400).json({ error: 'instituteId and moduleKey are required to renew' });
    }

    const result = await renewSubscription({
      instituteId,
      moduleKey,
      durationDays,
      billingCycle,
      priceRupeesSnapshot,
      paymentRef,
      renewedByEmail: req.user?.email || 'admin@questionstudio.com',
      note,
    });

    return res.json({
      ok: true,
      message: `Successfully renewed ${moduleKey} subscription`,
      ...result,
    });
  } catch (err) {
    console.error('Admin subscription renewal failed:', err);
    return res.status(500).json({ error: 'Renewal failed: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/admin/suspend
 * Super Admin only: Suspends an active module or bundle.
 */
router.post('/admin/suspend', requireAdmin, async (req, res) => {
  try {
    const { instituteId, moduleKey, note } = req.body;

    if (!instituteId || !moduleKey) {
      return res.status(400).json({ error: 'instituteId and moduleKey are required' });
    }

    const result = await setSubscriptionStatus({
      instituteId,
      moduleKey,
      status: 'SUSPENDED',
      performedByEmail: req.user?.email || 'admin@questionstudio.com',
      note,
    });

    return res.json({
      ok: true,
      message: `Successfully suspended ${moduleKey} subscription`,
      ...result,
    });
  } catch (err) {
    console.error('Admin subscription suspend failed:', err);
    return res.status(500).json({ error: 'Suspension failed: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/admin/cancel
 * Super Admin only: Cancels an active or pending subscription.
 */
router.post('/admin/cancel', requireAdmin, async (req, res) => {
  try {
    const { instituteId, moduleKey, note } = req.body;

    if (!instituteId || !moduleKey) {
      return res.status(400).json({ error: 'instituteId and moduleKey are required' });
    }

    const result = await setSubscriptionStatus({
      instituteId,
      moduleKey,
      status: 'CANCELLED',
      performedByEmail: req.user?.email || 'admin@questionstudio.com',
      note,
    });

    return res.json({
      ok: true,
      message: `Successfully cancelled ${moduleKey} subscription`,
      ...result,
    });
  } catch (err) {
    console.error('Admin subscription cancel failed:', err);
    return res.status(500).json({ error: 'Cancellation failed: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/admin/reactivate
 * Super Admin only: Reactivates a suspended subscription to ACTIVE status.
 */
router.post('/admin/reactivate', requireAdmin, async (req, res) => {
  try {
    const { instituteId, moduleKey, note } = req.body;

    if (!instituteId || !moduleKey) {
      return res.status(400).json({ error: 'instituteId and moduleKey are required' });
    }

    const result = await setSubscriptionStatus({
      instituteId,
      moduleKey,
      status: 'ACTIVE',
      action: 'REACTIVATED',
      performedByEmail: req.user?.email || 'admin@questionstudio.com',
      note: note ? `Reactivated: ${note}` : 'Reactivated by Super Admin',
    });

    return res.json({
      ok: true,
      message: `Successfully reactivated ${moduleKey} subscription`,
      ...result,
    });
  } catch (err) {
    console.error('Admin subscription reactivate failed:', err);
    return res.status(500).json({ error: 'Reactivation failed: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/admin/reject
 * Super Admin only: Rejects a pending subscription request.
 */
router.post('/admin/reject', requireAdmin, async (req, res) => {
  try {
    const { instituteId, moduleKey, note } = req.body;

    if (!instituteId || !moduleKey) {
      return res.status(400).json({ error: 'instituteId and moduleKey are required' });
    }

    const result = await setSubscriptionStatus({
      instituteId,
      moduleKey,
      status: 'CANCELLED',
      action: 'REJECTED',
      performedByEmail: req.user?.email || 'admin@questionstudio.com',
      note: note ? `Request rejected: ${note}` : 'Subscription request rejected by Super Admin',
    });

    return res.json({
      ok: true,
      message: `Successfully rejected ${moduleKey} request`,
      ...result,
    });
  } catch (err) {
    console.error('Admin subscription reject failed:', err);
    return res.status(500).json({ error: 'Rejection failed: ' + err.message });
  }
});

/**
 * POST /api/subscriptions/admin/deactivate
 * Super Admin only: Generic deactivation (SUSPENDED | CANCELLED | EXPIRED).
 */
router.post('/admin/deactivate', requireAdmin, async (req, res) => {
  try {
    const {
      instituteId,
      moduleKey,
      status = 'SUSPENDED',
      note,
    } = req.body;

    if (!instituteId || !moduleKey) {
      return res.status(400).json({ error: 'instituteId and moduleKey are required' });
    }

    if (!['SUSPENDED', 'CANCELLED', 'EXPIRED'].includes(status)) {
      return res.status(400).json({ error: 'status must be SUSPENDED, CANCELLED, or EXPIRED' });
    }

    const result = await setSubscriptionStatus({
      instituteId,
      moduleKey,
      status,
      performedByEmail: req.user?.email || 'admin@questionstudio.com',
      note,
    });

    return res.json({
      ok: true,
      message: `Successfully set ${moduleKey} status to ${status}`,
      ...result,
    });
  } catch (err) {
    console.error('Admin subscription deactivation failed:', err);
    return res.status(500).json({ error: 'Deactivation failed: ' + err.message });
  }
});

/**
 * GET /api/subscriptions/admin/history
 * Super Admin only: View chronological subscription audit history across colleges.
 * Query params: ?instituteId=, ?moduleKey=, ?action=, ?limit=
 */
router.get('/admin/history', requireAdmin, async (req, res) => {
  try {
    const { instituteId, moduleKey, action, limit = 100 } = req.query;

    const whereClause = {};
    if (instituteId) whereClause.instituteId = instituteId;
    if (moduleKey) whereClause.moduleKey = moduleKey;
    if (action) whereClause.action = action;

    const history = await prisma.subscriptionHistory.findMany({
      where: whereClause,
      include: {
        institute: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10) || 100,
    });

    return res.json({
      ok: true,
      count: history.length,
      history,
    });
  } catch (err) {
    console.error('Admin subscription history failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve subscription history: ' + err.message });
  }
});

module.exports = router;
