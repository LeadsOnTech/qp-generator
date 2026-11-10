const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { watermarkPdf } = require('../lib/watermarkPdf');

const router = express.Router();

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'marketplace');
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create marketplace uploads folder:', e.message);
}

// ============================================================================
// 1. PUBLIC STOREFRONT ENDPOINTS
// ============================================================================

/**
 * GET /api/marketplace/public/catalog
 * Returns available study materials for a specific college portal (or global)
 * Query filters: slug, exam, subject, category, search
 */
router.get('/public/catalog', async (req, res) => {
  try {
    const { slug, exam, subject, category, search } = req.query;

    let targetInstitute = null;
    if (slug) {
      targetInstitute = await prisma.institute.findUnique({
        where: { slug: slug.toLowerCase().trim() },
        select: { id: true, name: true, slug: true },
      });
    }

    const where = {
      isActive: true,
      OR: [
        { isGlobal: true }, // Super Admin Master Publications (visible on ALL college sites)
      ],
    };

    // If viewing a specific college's portal, also include books authored by that college
    if (targetInstitute) {
      where.OR.push({ instituteId: targetInstitute.id });
    }

    if (exam && exam !== 'ALL') {
      where.examTarget = { contains: exam };
    }

    if (subject && subject !== 'ALL') {
      where.subject = { contains: subject };
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (search && search.trim()) {
      where.AND = [
        {
          OR: [
            { title: { contains: search.trim() } },
            { subtitle: { contains: search.trim() } },
            { description: { contains: search.trim() } },
            { author: { contains: search.trim() } },
          ],
        },
      ];
    }

    const books = await prisma.marketplaceBook.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { salesCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        institute: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    const catalog = books.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      examTarget: b.examTarget,
      subject: b.subject,
      classYear: b.classYear,
      author: b.author,
      category: b.category,
      priceRupees: b.priceRupees,
      mrpRupees: b.mrpRupees,
      discountPct: b.mrpRupees && b.mrpRupees > b.priceRupees ? Math.round(((b.mrpRupees - b.priceRupees) / b.mrpRupees) * 100) : 0,
      coverImageUrl: b.coverImageUrl,
      pageCount: b.pageCount,
      rating: b.rating,
      reviewsCount: b.reviewsCount,
      salesCount: b.salesCount,
      isFeatured: b.isFeatured,
      isMasterBook: !b.instituteId,
      collegeAuthor: b.institute ? b.institute.name : null,
      affiliateCommissionPct: b.affiliateCommissionPct,
    }));

    res.json({
      success: true,
      college: targetInstitute ? { name: targetInstitute.name, slug: targetInstitute.slug } : null,
      total: catalog.length,
      books: catalog,
    });
  } catch (err) {
    console.error('Error fetching marketplace catalog:', err);
    res.status(500).json({ error: 'Failed to retrieve study materials catalog.' });
  }
});

/**
 * GET /api/marketplace/public/book/:id
 * Single book details
 */
router.get('/public/book/:id', async (req, res) => {
  try {
    const book = await prisma.marketplaceBook.findUnique({
      where: { id: req.params.id },
      include: {
        institute: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!book || !book.isActive) {
      return res.status(404).json({ error: 'Study material publication not found.' });
    }

    res.json({
      success: true,
      book: {
        ...book,
        discountPct: book.mrpRupees && book.mrpRupees > book.priceRupees ? Math.round(((book.mrpRupees - book.priceRupees) / book.mrpRupees) * 100) : 0,
        isMasterBook: !book.instituteId,
        collegeAuthor: book.institute ? book.institute.name : null,
      },
    });
  } catch (err) {
    console.error('Error fetching book details:', err);
    res.status(500).json({ error: 'Failed to load publication details.' });
  }
});

// ============================================================================
// 2. CHECKOUT & REVENUE SPLIT ENGINE
// ============================================================================

/**
 * POST /api/marketplace/checkout/create-order
 * Initiates an order for a student and calculates revenue share
 */
router.post('/checkout/create-order', async (req, res) => {
  try {
    const { bookId, collegeSlug, buyerName, buyerPhone, buyerEmail, paymentMethod = 'UPI_RAZORPAY' } = req.body;

    if (!bookId) return res.status(400).json({ error: 'Book ID is required.' });
    if (!buyerName || !buyerName.trim()) return res.status(400).json({ error: 'Student full name is required.' });
    if (!buyerPhone || buyerPhone.trim().length < 10) return res.status(400).json({ error: 'Valid mobile number is required.' });

    const book = await prisma.marketplaceBook.findUnique({
      where: { id: bookId },
      include: { institute: true },
    });

    if (!book || !book.isActive) {
      return res.status(404).json({ error: 'Selected book is not available.' });
    }

    // Determine the selling college if bought through a college subpath
    let sellingInstitute = null;
    if (collegeSlug) {
      sellingInstitute = await prisma.institute.findUnique({
        where: { slug: collegeSlug.toLowerCase().trim() },
      });
    }

    // Revenue Split Calculations:
    const amountRupees = book.priceRupees;
    let collegeShareRupees = 0;
    let platformShareRupees = 0;

    if (!book.instituteId) {
      // 1. Super Admin Master Publication:
      // If sold through a college's website, college earns 10% affiliate commission!
      if (sellingInstitute) {
        collegeShareRupees = Math.round((amountRupees * (book.affiliateCommissionPct / 100)) * 100) / 100;
        platformShareRupees = Math.round((amountRupees - collegeShareRupees) * 100) / 100;
      } else {
        collegeShareRupees = 0;
        platformShareRupees = amountRupees;
      }
    } else {
      // 2. College's Own Proprietary Publication:
      // Platform takes 10% commission, college receives 90% revenue!
      platformShareRupees = Math.round((amountRupees * 0.10) * 100) / 100;
      collegeShareRupees = Math.round((amountRupees - platformShareRupees) * 100) / 100;
      sellingInstitute = book.institute; // The owning college gets the share
    }

    const orderNumber = `QS-BK-${Math.floor(100000 + Math.random() * 900000)}`;
    const downloadToken = crypto.randomBytes(24).toString('hex');
    const downloadExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days access

    const order = await prisma.marketplaceOrder.create({
      data: {
        orderNumber,
        bookId: book.id,
        sellingInstituteId: sellingInstitute ? sellingInstitute.id : null,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerEmail: (buyerEmail || '').trim() || `${buyerPhone.trim()}@student.questionstudio.in`,
        amountRupees,
        collegeShareRupees,
        platformShareRupees,
        payoutMode: 'WALLET_CREDITS',
        paymentStatus: 'COMPLETED', // Instant digital delivery confirmation
        paymentMethod,
        downloadToken,
        downloadExpiresAt,
      },
    });

    // Automatically update book sales count
    await prisma.marketplaceBook.update({
      where: { id: book.id },
      data: { salesCount: { increment: 1 } },
    });

    // If a college earned revenue, credit their institutional wallet & add QP generation credits!
    let creditsAwarded = 0;
    if (sellingInstitute && collegeShareRupees > 0) {
      const sharePaise = Math.round(collegeShareRupees * 100);
      creditsAwarded = Math.round(collegeShareRupees); // ₹1 = 1 Free Question Credit

      await prisma.$transaction([
        prisma.institute.update({
          where: { id: sellingInstitute.id },
          data: {
            marketplaceEarningsPaise: { increment: sharePaise },
            creditBalance: { increment: creditsAwarded },
          },
        }),
        prisma.creditTransaction.create({
          data: {
            instituteId: sellingInstitute.id,
            amount: creditsAwarded,
            reason: `Affiliate Revenue: Sold "${book.title.substring(0, 40)}" (Order #${orderNumber})`,
          },
        }),
        prisma.marketplaceOrder.update({
          where: { id: order.id },
          data: { creditsAwarded },
        }),
      ]);
    }

    res.json({
      success: true,
      orderNumber,
      downloadToken,
      downloadUrl: `/api/marketplace/download/${downloadToken}`,
      amountRupees,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      bookTitle: book.title,
      creditsAwarded,
      collegeEarned: collegeShareRupees,
    });
  } catch (err) {
    console.error('Error creating marketplace order:', err);
    res.status(500).json({ error: 'Failed to process study material order: ' + err.message });
  }
});

// ============================================================================
// 3. SECURED ANTI-PIRACY DRM WATERMARK DELIVERY
// ============================================================================

/**
 * GET /api/marketplace/download/:token
 * Serves the PDF permanently watermarked with student's Name, Phone & Order ID
 */
router.get('/download/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const order = await prisma.marketplaceOrder.findUnique({
      where: { downloadToken: token },
      include: {
        book: true,
        sellingInstitute: true,
      },
    });

    if (!order) {
      return res.status(404).send('Invalid or expired download link.');
    }

    if (order.paymentStatus !== 'COMPLETED') {
      return res.status(403).send('Payment has not been completed for this order.');
    }

    if (order.downloadCount >= order.maxDownloads) {
      return res.status(410).send('Maximum download limit reached (10 downloads). Please contact support.');
    }

    // Increment download count
    await prisma.marketplaceOrder.update({
      where: { id: order.id },
      data: { downloadCount: { increment: 1 } },
    });

    const book = order.book;
    const originalPdfPath = path.join(UPLOAD_DIR, book.fileKey);

    const orderInfo = {
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      orderNumber: order.orderNumber,
      collegeName: order.sellingInstitute ? order.sellingInstitute.name : 'QuestionStudio Academic Portal',
      bookTitle: book.title,
      author: book.author,
      examTarget: book.examTarget,
    };

    // Apply anti-piracy DRM watermark
    const watermarkedPdfBuffer = await watermarkPdf(originalPdfPath, orderInfo);

    const safeTitle = (book.title || 'Study_Material').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_Protected.pdf"`);
    res.setHeader('Content-Length', watermarkedPdfBuffer.length);
    res.send(watermarkedPdfBuffer);
  } catch (err) {
    console.error('Error serving watermarked PDF:', err);
    res.status(500).send('Error generating secured watermarked publication.');
  }
});

// ============================================================================
// 4. COLLEGE MANAGEMENT & EARNINGS ENDPOINTS
// ============================================================================

/**
 * GET /api/marketplace/institute/earnings
 * Overview of college's bookstore earnings, sold books & auto-credits
 */
router.get('/institute/earnings', requireAuth, async (req, res) => {
  try {
    const instituteId = req.user.role === 'ADMIN'
      ? (req.query.instituteId || req.user.instituteId)
      : req.user.instituteId;

    if (!instituteId) {
      return res.status(400).json({ error: 'Institute ID is required.' });
    }

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: {
        id: true,
        name: true,
        slug: true,
        creditBalance: true,
        marketplaceEarningsPaise: true,
        marketplaceCreditsAutoConvert: true,
      },
    });

    if (!institute) return res.status(404).json({ error: 'Institute not found.' });

    // Orders sold through this college
    const orders = await prisma.marketplaceOrder.findMany({
      where: {
        sellingInstituteId: instituteId,
        paymentStatus: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        book: {
          select: { title: true, examTarget: true, author: true, priceRupees: true, instituteId: true },
        },
      },
    });

    // College's own published books
    const myBooks = await prisma.marketplaceBook.findMany({
      where: { instituteId },
      orderBy: { createdAt: 'desc' },
    });

    const totalSold = orders.length;
    const totalEarningsRupees = (institute.marketplaceEarningsPaise || 0) / 100;
    const totalCreditsEarned = orders.reduce((acc, o) => acc + (o.creditsAwarded || 0), 0);

    res.json({
      success: true,
      institute: {
        id: institute.id,
        name: institute.name,
        slug: institute.slug,
        creditBalance: institute.creditBalance,
        totalEarningsRupees,
        totalCreditsEarned,
        marketplaceCreditsAutoConvert: institute.marketplaceCreditsAutoConvert,
      },
      stats: {
        totalSold,
        totalEarningsRupees,
        totalCreditsEarned,
        myPublishedBooksCount: myBooks.length,
      },
      recentOrders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        buyerName: o.buyerName,
        buyerPhone: o.buyerPhone,
        bookTitle: o.book.title,
        examTarget: o.book.examTarget,
        amountRupees: o.amountRupees,
        collegeShareRupees: o.collegeShareRupees,
        creditsAwarded: o.creditsAwarded,
        date: o.createdAt,
        isOwnBook: o.book.instituteId === instituteId,
      })),
      myBooks,
    });
  } catch (err) {
    console.error('Error fetching institute marketplace earnings:', err);
    res.status(500).json({ error: 'Failed to load bookstore earnings.' });
  }
});

/**
 * POST /api/marketplace/institute/upload-material
 * College publishes their own study material with price & description
 */
router.post('/institute/upload-material', requireAuth, async (req, res) => {
  try {
    const instituteId = req.user.role === 'ADMIN'
      ? (req.body.instituteId || req.user.instituteId)
      : req.user.instituteId;

    if (!instituteId) return res.status(400).json({ error: 'Institute ID is required.' });

    const {
      title,
      subtitle,
      description,
      examTarget = 'NEET',
      subject = 'Comprehensive',
      classYear = 'Class 12',
      author,
      priceRupees = 199.00,
      mrpRupees = 499.00,
      coverImageUrl,
      category = 'STUDY_MATERIAL',
      isGlobal = false, // Defaults to college's private site unless requested
    } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Publication title is required.' });

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { name: true },
    });

    const book = await prisma.marketplaceBook.create({
      data: {
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        description: description ? description.trim() : null,
        examTarget,
        subject,
        classYear,
        author: author ? author.trim() : `${institute?.name || 'College'} Senior Faculty`,
        category,
        priceRupees: parseFloat(priceRupees) || 199.00,
        mrpRupees: parseFloat(mrpRupees) || 499.00,
        coverImageUrl: coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        fileKey: `college_${instituteId}_${Date.now()}.pdf`,
        sampleFileKey: `preview_${instituteId}_${Date.now()}.pdf`,
        pageCount: 120,
        isGlobal: Boolean(isGlobal),
        instituteId,
        affiliateCommissionPct: 10.0,
      },
    });

    res.json({ success: true, book });
  } catch (err) {
    console.error('Error uploading college study material:', err);
    res.status(500).json({ error: 'Failed to publish study material: ' + err.message });
  }
});

// ============================================================================
// 5. SUPER ADMIN MASTER MARKETPLACE COMMAND
// ============================================================================

/**
 * GET /api/marketplace/admin/reconciliation
 * Platform-wide financial report across all 800 colleges
 */
router.get('/admin/reconciliation', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [allBooks, allOrders, totalInstitutes] = await Promise.all([
      prisma.marketplaceBook.findMany({
        include: { institute: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.marketplaceOrder.findMany({
        where: { paymentStatus: 'COMPLETED' },
        include: {
          book: { select: { title: true, isGlobal: true, priceRupees: true } },
          sellingInstitute: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.institute.count(),
    ]);

    const grossSalesRupees = allOrders.reduce((sum, o) => sum + o.amountRupees, 0);
    const totalCollegePayoutsRupees = allOrders.reduce((sum, o) => sum + o.collegeShareRupees, 0);
    const netPlatformRevenueRupees = allOrders.reduce((sum, o) => sum + o.platformShareRupees, 0);
    const totalCreditsAwarded = allOrders.reduce((sum, o) => sum + (o.creditsAwarded || 0), 0);

    res.json({
      success: true,
      summary: {
        totalBooks: allBooks.length,
        masterBooksCount: allBooks.filter((b) => !b.instituteId).length,
        collegeBooksCount: allBooks.filter((b) => b.instituteId).length,
        totalOrders: allOrders.length,
        grossSalesRupees,
        totalCollegePayoutsRupees,
        netPlatformRevenueRupees,
        totalCreditsAwarded,
        totalActiveColleges: totalInstitutes,
      },
      orders: allOrders.slice(0, 50),
      books: allBooks,
    });
  } catch (err) {
    console.error('Error in admin marketplace reconciliation:', err);
    res.status(500).json({ error: 'Failed to load marketplace reconciliation.' });
  }
});

/**
 * POST /api/marketplace/admin/upload-master-book
 * Super Admin creates a master publication syndicated to ALL 800 college sites
 */
router.post('/admin/upload-master-book', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      examTarget = 'NEET',
      subject = 'Comprehensive',
      classYear = 'Class 12',
      author = 'QuestionStudio Academic Editorial Board',
      priceRupees = 199.00,
      mrpRupees = 499.00,
      coverImageUrl,
      category = 'FORMULA_BOOK',
      pageCount = 160,
    } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Book title is required.' });

    const masterBook = await prisma.marketplaceBook.create({
      data: {
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        description: description ? description.trim() : null,
        examTarget,
        subject,
        classYear,
        author: author.trim(),
        category,
        priceRupees: parseFloat(priceRupees) || 199.00,
        mrpRupees: parseFloat(mrpRupees) || 499.00,
        coverImageUrl: coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
        fileKey: `master_${Date.now()}.pdf`,
        sampleFileKey: `preview_master_${Date.now()}.pdf`,
        pageCount: parseInt(pageCount) || 160,
        isGlobal: true, // Syndicates to ALL 800 colleges!
        instituteId: null, // Super Admin Master content
        affiliateCommissionPct: 10.0, // 10% commission to selling college
      },
    });

    res.json({ success: true, masterBook });
  } catch (err) {
    console.error('Error creating master publication:', err);
    res.status(500).json({ error: 'Failed to create master publication: ' + err.message });
  }
});

module.exports = router;
