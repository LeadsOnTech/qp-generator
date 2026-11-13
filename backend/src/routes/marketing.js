const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { requireAuth, requireAdmin, JWT_SECRET } = require('../lib/auth');
const whatsAppService = require('../lib/whatsapp');

const router = express.Router();

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (!payload.pendingTwoFactor) {
        req.user = payload;
      }
    } catch (e) {}
  }
  next();
}

/**
 * Normalizes input phone to digits
 */
function cleanPhone(p) {
  if (!p) return '';
  return String(p).replace(/\D/g, '');
}

/**
 * POST /api/marketing/promotions
 * Public or Authenticated — submits a new Social Media Marketing & Promotion Request.
 * Automatically dispatches dual WhatsApp notifications:
 * 1) Super Admin immediate lead notification
 * 2) College Management instant confirmation
 */
router.post('/promotions', optionalAuth, async (req, res) => {
  try {
    const {
      collegeName,
      contactPerson,
      designation,
      phone,
      email,
      promotionGoals,
      targetCities,
      budgetRange,
      estimatedStudents,
      campaignNotes,
      instituteId: customInstituteId,
    } = req.body;

    if (!collegeName || !collegeName.trim()) {
      return res.status(400).json({ error: 'College / Institution name is required.' });
    }
    if (!contactPerson || !contactPerson.trim()) {
      return res.status(400).json({ error: 'Contact person name is required.' });
    }
    const digitsOnly = cleanPhone(phone);
    if (!digitsOnly || digitsOnly.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian phone / WhatsApp number.' });
    }

    let goalsString = '';
    if (Array.isArray(promotionGoals)) {
      goalsString = promotionGoals.join(', ');
    } else if (typeof promotionGoals === 'string') {
      goalsString = promotionGoals.trim();
    }
    if (!goalsString) {
      goalsString = 'General Admission & Online Exam Promotion';
    }

    // Determine instituteId if authenticated or passed
    const resolvedInstituteId = req.user?.instituteId || customInstituteId || null;

    const lead = await prisma.marketingPromotionLead.create({
      data: {
        instituteId: resolvedInstituteId,
        collegeName: collegeName.trim(),
        contactPerson: contactPerson.trim(),
        designation: designation ? designation.trim() : null,
        phone: digitsOnly,
        email: email ? email.trim() : null,
        promotionGoals: goalsString,
        targetCities: targetCities ? targetCities.trim() : null,
        budgetRange: budgetRange ? budgetRange.trim() : null,
        estimatedStudents: estimatedStudents ? estimatedStudents.trim() : null,
        campaignNotes: campaignNotes ? campaignNotes.trim() : null,
        status: 'NEW',
      },
    });

    // Asynchronously dispatch WhatsApp notifications so API response is fast & responsive
    Promise.allSettled([
      whatsAppService.sendMarketingLeadAlertToAdmin({ lead }),
      whatsAppService.sendMarketingConfirmationToCollege({ lead }),
    ]).catch((err) => {
      console.warn('[MARKETING NOTIFICATION WARN]', err.message);
    });

    res.status(201).json({
      ok: true,
      message: 'Thank you! Your promotion and marketing campaign request has been received. Our team will contact you within 24 hours.',
      leadId: lead.id,
      lead,
    });
  } catch (err) {
    console.error('Failed to submit marketing promotion request:', err);
    res.status(500).json({ error: 'Failed to submit promotion request: ' + err.message });
  }
});

/**
 * GET /api/marketing/promotions/my
 * Authenticated Institute — lists campaign requests submitted by this college.
 */
router.get('/promotions/my', requireAuth, async (req, res) => {
  try {
    if (!req.user?.instituteId) {
      return res.status(403).json({ error: 'Only institute accounts have access to college campaigns.' });
    }

    const leads = await prisma.marketingPromotionLead.findMany({
      where: { instituteId: req.user.instituteId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ok: true, count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch college marketing leads: ' + err.message });
  }
});

/**
 * GET /api/marketing/promotions
 * ADMIN ONLY — lists all marketing leads with filtering and analytics.
 */
router.get('/promotions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { collegeName: { contains: q } },
        { contactPerson: { contains: q } },
        { phone: { contains: q } },
        { targetCities: { contains: q } },
      ];
    }

    const [leads, totalCount, statusCounts] = await Promise.all([
      prisma.marketingPromotionLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          institute: {
            select: { id: true, name: true, slug: true, phone: true, creditBalance: true },
          },
        },
      }),
      prisma.marketingPromotionLead.count({ where }),
      prisma.marketingPromotionLead.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const summary = {
      total: 0,
      NEW: 0,
      CONTACTED: 0,
      PROPOSAL_SENT: 0,
      CAMPAIGN_LIVE: 0,
      CONVERTED: 0,
      CLOSED: 0,
    };
    for (const sc of statusCounts) {
      summary[sc.status] = sc._count.id;
      summary.total += sc._count.id;
    }

    res.json({
      ok: true,
      totalCount,
      summary,
      leads,
    });
  } catch (err) {
    console.error('Failed to list marketing leads:', err);
    res.status(500).json({ error: 'Failed to list marketing leads: ' + err.message });
  }
});

/**
 * PATCH /api/marketing/promotions/:id
 * ADMIN ONLY — update marketing lead status or internal notes.
 */
router.patch('/promotions/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const existing = await prisma.marketingPromotionLead.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Marketing lead not found.' });

    const updateData = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'CONTACTED' && !existing.contactedAt) {
        updateData.contactedAt = new Date();
      }
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const updated = await prisma.marketingPromotionLead.update({
      where: { id },
      data: updateData,
    });

    res.json({ ok: true, lead: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update marketing lead: ' + err.message });
  }
});

/**
 * DELETE /api/marketing/promotions/:id
 * ADMIN ONLY — deletes a marketing lead.
 */
router.delete('/promotions/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.marketingPromotionLead.delete({ where: { id } });
    res.json({ ok: true, message: 'Marketing lead deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete marketing lead: ' + err.message });
  }
});

module.exports = router;
