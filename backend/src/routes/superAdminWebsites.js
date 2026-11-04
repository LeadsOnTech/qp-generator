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
