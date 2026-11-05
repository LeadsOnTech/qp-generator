const express = require('express');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/college-websites
 * Lists all college websites registered on the platform
 */
router.get('/', async (req, res) => {
  try {
    // 1. Auto-bootstrap CollegeWebsite for any registered institute that doesn't have one yet
    const allInstitutes = await prisma.institute.findMany({
      select: { id: true, name: true, slug: true, phone: true, address: true, tagline: true },
    });
    const existingWebsites = await prisma.collegeWebsite.findMany({ select: { instituteId: true } });
    const existingIds = new Set(existingWebsites.map((w) => w.instituteId));

    for (const inst of allInstitutes) {
      if (!existingIds.has(inst.id)) {
        await prisma.collegeWebsite.create({
          data: {
            instituteId: inst.id,
            slug: inst.slug,
            displayName: inst.name,
            mottoTagline: inst.tagline || 'Excellence in Education',
            contactPhone: inst.phone || '',
            campusAddress: inst.address || '',
            aboutTitle: `About ${inst.name}`,
            aboutText: `${inst.name} is dedicated to fostering academic excellence, holistic character, and competitive leadership. Our students consistently excel in state and national examinations.`,
            statsCountersJson: JSON.stringify([
              { label: 'Successful Alumni', value: '10,000+' },
              { label: 'NEET/JEE Selections', value: '2,500+' },
              { label: 'Expert Faculty', value: '50+' },
              { label: 'State Ranks', value: '150+' },
            ]),
          },
        });
      }
    }

    // 2. Fetch full website list
    const websites = await prisma.collegeWebsite.findMany({
      include: {
        institute: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            address: true,
            logoFilename: true,
            createdAt: true,
            users: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            courses: true,
            faculties: true,
            facilities: true,
            achievements: true,
            testimonials: true,
            galleryItems: true,
            enquiries: true,
            jobPostings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ websites });
  } catch (err) {
    console.error('Error fetching admin college websites:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/college-websites/:id/modules
 * Super admin updates licensed feature modules for this college
 */
router.patch('/:id/modules', async (req, res) => {
  try {
    const { id } = req.params;
    const { hasOnlineExamModule, hasRecruitmentModule, hasCrmModule, hasAdvertisingModule } = req.body;

    const data = {};
    if (typeof hasOnlineExamModule === 'boolean') data.hasOnlineExamModule = hasOnlineExamModule;
    if (typeof hasRecruitmentModule === 'boolean') data.hasRecruitmentModule = hasRecruitmentModule;
    if (typeof hasCrmModule === 'boolean') data.hasCrmModule = hasCrmModule;
    if (typeof hasAdvertisingModule === 'boolean') data.hasAdvertisingModule = hasAdvertisingModule;

    const updated = await prisma.collegeWebsite.update({
      where: { id },
      data,
    });

    res.json({ ok: true, website: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/college-websites/:id/reset-password
 * Super admin sets/resets a college admin's login password
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const website = await prisma.collegeWebsite.findUnique({
      where: { id },
      include: {
        institute: {
          include: { users: true },
        },
      },
    });

    if (!website || !website.institute) {
      return res.status(404).json({ error: 'College website or institute not found.' });
    }

    const adminUser = website.institute.users[0];
    if (!adminUser) {
      return res.status(404).json({ error: 'No user account found for this college.' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: adminUser.id },
      data: { passwordHash },
    });

    res.json({
      ok: true,
      email: adminUser.email,
      message: `Password for ${adminUser.email} has been successfully updated.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/college-websites/:id/status
 * Super admin updates status (ACTIVE | SUSPENDED | UNDER_REVIEW)
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isPublished } = req.body;

    const data = {};
    if (status) data.status = status;
    if ('isPublished' in req.body) data.isPublished = Boolean(isPublished);

    const updated = await prisma.collegeWebsite.update({
      where: { id },
      data,
    });

    res.json({ ok: true, website: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
