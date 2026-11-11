const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { watermarkPdf } = require('../lib/watermarkPdf');

const router = express.Router();

// Ensure upload directories exist
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'marketplace');
const COVERS_DIR = path.join(UPLOAD_DIR, 'covers');
const BOOKS_DIR = path.join(UPLOAD_DIR, 'books');
[UPLOAD_DIR, COVERS_DIR, BOOKS_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.warn(`Could not create directory ${dir}:`, e.message);
  }
});

// Auto-synchronize marketplace database schema and columns on startup
try {
  const { ensureMarketplaceSchema } = require('../lib/marketplaceSchemaSync');
  ensureMarketplaceSchema().catch((err) => console.warn('[MARKETPLACE DB SYNC NOTE]', err.message));
} catch (e) {
  // safe fallback
}

// Multer storage for book cover images
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, COVERS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `cover-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const coverUpload = multer({
  storage: coverStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files (JPG, PNG, WebP) are allowed for book covers.'));
    }
    cb(null, true);
  },
});

// Multer storage for book PDFs
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, BOOKS_DIR),
  filename: (req, file, cb) => {
    cb(null, `book-${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`);
  },
});
const pdfUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF documents are allowed for study materials.'));
    }
    cb(null, true);
  },
});

// Robust Institute ID resolver to prevent "Institute ID is required" blocker while strictly enforcing tenant isolation
async function resolveMarketplaceInstituteId(req, explicitId = null) {
  if (req.user?.role === 'ADMIN') {
    const target = explicitId || req.query?.instituteId || req.body?.instituteId || req.user?.instituteId;
    if (target) return target;
    const fallback = await prisma.institute.findFirst({ orderBy: { createdAt: 'asc' } });
    return fallback?.id || null;
  }

  // Non-admin (Institute User): strictly scoped to their own verified institute
  if (req.user?.instituteId) return req.user.instituteId;
  if (req.user?.userId) {
    try {
      const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { instituteId: true } });
      if (u?.instituteId) return u.instituteId;
    } catch (e) {}
  }
  return null;
}

// ============================================================================
// 1. PUBLIC STOREFRONT ENDPOINTS
// ============================================================================

/**
 * GET /api/marketplace/public/catalog
 * Returns available study materials for a specific college portal (or central marketplace)
 * Query filters: slug, exam, subject, category, fulfillmentType, search, sort
 */
router.get('/public/catalog', async (req, res) => {
  try {
    const { slug, exam, subject, category, fulfillmentType, search, sort } = req.query;

    let targetInstitute = null;
    if (slug) {
      targetInstitute = await prisma.institute.findUnique({
        where: { slug: slug.toLowerCase().trim() },
        select: { id: true, name: true, slug: true },
      });
    }

    const where = {
      isActive: true,
    };

    if (targetInstitute) {
      // College storefront view:
      // Show either:
      // 1) Globally approved publications syndicated across all colleges
      // 2) Publications authored by this college that are active and not rejected/archived
      where.OR = [
        { isGlobal: true, moderationStatus: 'APPROVED_GLOBAL' },
        {
          instituteId: targetInstitute.id,
          moderationStatus: { notIn: ['REJECTED', 'ARCHIVED'] },
        },
      ];
    } else {
      // Central Marketplace view:
      // ONLY approved global publications
      where.isGlobal = true;
      where.moderationStatus = 'APPROVED_GLOBAL';
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

    if (fulfillmentType && fulfillmentType !== 'ALL') {
      where.fulfillmentType = fulfillmentType;
    }

    if (search && search.trim()) {
      const term = search.trim();
      const searchClause = {
        OR: [
          { title: { contains: term } },
          { subtitle: { contains: term } },
          { description: { contains: term } },
          { author: { contains: term } },
        ],
      };
      if (where.AND) {
        where.AND.push(searchClause);
      } else {
        where.AND = [searchClause];
      }
    }

    // Dynamic sorting
    let orderBy = [
      { isFeatured: 'desc' },
      { salesCount: 'desc' },
      { createdAt: 'desc' },
    ];
    if (sort === 'price_asc') {
      orderBy = [{ priceRupees: 'asc' }];
    } else if (sort === 'price_desc') {
      orderBy = [{ priceRupees: 'desc' }];
    } else if (sort === 'newest') {
      orderBy = [{ createdAt: 'desc' }];
    } else if (sort === 'rating') {
      orderBy = [{ rating: 'desc' }, { reviewsCount: 'desc' }];
    }

    let books;
    try {
      books = await prisma.marketplaceBook.findMany({
        where,
        orderBy,
        include: {
          institute: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
    } catch (queryErr) {
      console.warn('[MARKETPLACE CATALOG QUERY FALLBACK]', queryErr.message);
      // Self-healing: If table or columns are missing, run schema sync on demand!
      try {
        const { ensureMarketplaceSchema } = require('../lib/marketplaceSchemaSync');
        await ensureMarketplaceSchema();
      } catch (syncErr) {
        console.error('[MARKETPLACE ON-DEMAND SYNC ERROR]', syncErr.message);
      }

      const fallbackWhere = { isActive: true };
      if (exam && exam !== 'ALL') fallbackWhere.examTarget = { contains: exam };
      if (subject && subject !== 'ALL') fallbackWhere.subject = { contains: subject };
      try {
        books = await prisma.marketplaceBook.findMany({
          where: fallbackWhere,
          orderBy: [{ isFeatured: 'desc' }, { salesCount: 'desc' }, { createdAt: 'desc' }],
          include: {
            institute: {
              select: { id: true, name: true, slug: true },
            },
          },
        });
      } catch (retryErr) {
        console.error('[MARKETPLACE RETRY ERROR]', retryErr.message);
        books = [];
      }
    }

    const catalog = books.map((b) => ({
      id: b.id,
      sku: b.sku,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      examTarget: b.examTarget,
      subject: b.subject,
      classYear: b.classYear,
      author: b.author,
      category: b.category,
      fulfillmentType: b.fulfillmentType || 'DIGITAL_PDF',
      stockQuantity: b.stockQuantity ?? 0,
      lowStockThreshold: b.lowStockThreshold ?? 10,
      weightGrams: b.weightGrams ?? 300,
      priceRupees: b.priceRupees,
      mrpRupees: b.mrpRupees,
      discountPct: b.mrpRupees && b.mrpRupees > b.priceRupees ? Math.round(((b.mrpRupees - b.priceRupees) / b.mrpRupees) * 100) : 0,
      coverImageUrl: b.coverImageUrl,
      sampleFileKey: b.sampleFileKey,
      pageCount: b.pageCount,
      rating: b.rating,
      reviewsCount: b.reviewsCount,
      salesCount: b.salesCount,
      isFeatured: b.isFeatured,
      isMasterBook: !b.instituteId,
      isGlobal: b.isGlobal,
      moderationStatus: b.moderationStatus,
      collegeAuthor: b.institute ? b.institute.name : null,
      instituteId: b.instituteId,
      affiliateCommissionPct: b.affiliateCommissionPct,
    }));

    res.json({
      success: true,
      college: targetInstitute ? { id: targetInstitute.id, name: targetInstitute.name, slug: targetInstitute.slug } : null,
      total: catalog.length,
      books: catalog,
    });
  } catch (err) {
    console.error('Error fetching marketplace catalog:', err);
    res.status(500).json({ error: 'Failed to retrieve study materials catalog.', details: err.message });
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
          select: { id: true, name: true, slug: true, phone: true, address: true, website: true },
        },
      },
    });

    if (!book || !book.isActive || book.moderationStatus === 'REJECTED' || book.moderationStatus === 'ARCHIVED') {
      return res.status(404).json({ error: 'Study material publication not found.' });
    }

    res.json({
      success: true,
      book: {
        ...book,
        fulfillmentType: book.fulfillmentType || 'DIGITAL_PDF',
        stockQuantity: book.stockQuantity ?? 0,
        lowStockThreshold: book.lowStockThreshold ?? 10,
        weightGrams: book.weightGrams ?? 300,
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

    // Marketplace Commission Ledger: Accrued Earnings Mode
    // Commission is accrued in the financial ledger (marketplaceEarningsPaise).
    // Note: Auto-conversion to QP credits is strictly disabled per financial safety policy.
    // Payout settlements remain pending until a settlement policy is separately approved.
    const creditsAwarded = 0;
    if (sellingInstitute && collegeShareRupees > 0) {
      const sharePaise = Math.round(collegeShareRupees * 100);

      await prisma.institute.update({
        where: { id: sellingInstitute.id },
        data: {
          marketplaceEarningsPaise: { increment: sharePaise },
        },
      });

      await prisma.marketplaceOrder.update({
        where: { id: order.id },
        data: { creditsAwarded: 0 },
      });
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
    const instituteId = await resolveMarketplaceInstituteId(req);

    if (!instituteId) {
      return res.status(400).json({ error: 'Please configure your college profile first.' });
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
    const instituteId = await resolveMarketplaceInstituteId(req, req.body.instituteId);

    if (!instituteId) return res.status(400).json({ error: 'Please configure your college profile first.' });

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
      fulfillmentType = 'DIGITAL_PDF',
      stockQuantity = 0,
      lowStockThreshold = 10,
      weightGrams = 300,
      sku,
      pageCount = 120,
      isGlobal = false,
      requestedScope,
    } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Publication title is required.' });

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { name: true, slug: true },
    });

    const wantsGlobal = requestedScope === 'GLOBAL' || Boolean(isGlobal);
    // If requesting global syndication: queued for review (isGlobal remains false until Super Admin approves)
    // If college only: draft status, visible immediately on own college portal
    const moderationStatus = wantsGlobal ? 'SUBMITTED_FOR_REVIEW' : 'DRAFT';
    const effectiveIsGlobal = false;

    const generatedSku = sku ? sku.trim().toUpperCase() : `SKU-${institute?.slug?.toUpperCase().slice(0, 4) || 'COL'}-${Date.now().toString().slice(-6)}`;

    const book = await prisma.marketplaceBook.create({
      data: {
        sku: generatedSku,
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        description: description ? description.trim() : null,
        examTarget,
        subject,
        classYear,
        author: author ? author.trim() : `${institute?.name || 'College'} Senior Faculty`,
        category,
        fulfillmentType: ['DIGITAL_PDF', 'PHYSICAL_PRINT', 'BUNDLE_HYBRID'].includes(fulfillmentType) ? fulfillmentType : 'DIGITAL_PDF',
        priceRupees: parseFloat(priceRupees) || 199.00,
        mrpRupees: parseFloat(mrpRupees) || 499.00,
        stockQuantity: parseInt(stockQuantity) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        weightGrams: parseInt(weightGrams) || 300,
        coverImageUrl: coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        fileKey: `college_${instituteId}_${Date.now()}.pdf`,
        sampleFileKey: `preview_${instituteId}_${Date.now()}.pdf`,
        pageCount: parseInt(pageCount) || 120,
        isGlobal: effectiveIsGlobal,
        moderationStatus,
        instituteId,
        affiliateCommissionPct: 10.0,
      },
    });

    res.json({
      success: true,
      message: wantsGlobal
        ? 'Publication submitted for Super Admin review to syndicate globally.'
        : 'Publication added to your college bookstore.',
      book,
    });
  } catch (err) {
    console.error('Error uploading college study material:', err);
    res.status(500).json({ error: 'Failed to publish study material: ' + err.message });
  }
});

// ============================================================================
// 5. COLLEGE SELLER STUDIO ENDPOINTS
// ============================================================================

/**
 * GET /api/marketplace/seller/my-products
 * Returns all products published by the authenticated college with status breakdown
 */
router.get('/seller/my-products', requireAuth, async (req, res) => {
  try {
    const instituteId = await resolveMarketplaceInstituteId(req);
    if (!instituteId) {
      return res.status(400).json({ error: 'Please configure your college profile first.' });
    }

    const { status, fulfillmentType, search } = req.query;
    const where = { instituteId };

    if (status && status !== 'ALL') {
      where.moderationStatus = status;
    }
    if (fulfillmentType && fulfillmentType !== 'ALL') {
      where.fulfillmentType = fulfillmentType;
    }
    if (search && search.trim()) {
      where.title = { contains: search.trim() };
    }

    const [products, counts] = await Promise.all([
      prisma.marketplaceBook.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.marketplaceBook.groupBy({
        by: ['moderationStatus'],
        where: { instituteId },
        _count: { _all: true },
      }),
    ]);

    const statusCounts = {
      TOTAL: 0,
      DRAFT: 0,
      SUBMITTED_FOR_REVIEW: 0,
      APPROVED_GLOBAL: 0,
      REJECTED: 0,
      ARCHIVED: 0,
    };
    counts.forEach((c) => {
      statusCounts[c.moderationStatus] = c._count._all;
      statusCounts.TOTAL += c._count._all;
    });

    res.json({
      success: true,
      instituteId,
      statusCounts,
      products,
    });
  } catch (err) {
    console.error('Error fetching seller products:', err);
    res.status(500).json({ error: 'Failed to load seller products: ' + err.message });
  }
});

/**
 * POST /api/marketplace/seller/products
 * College creates a new product (either College-Only or submitted for Global review)
 */
router.post('/seller/products', requireAuth, async (req, res) => {
  try {
    const instituteId = await resolveMarketplaceInstituteId(req, req.body.instituteId);
    if (!instituteId) {
      return res.status(400).json({ error: 'Please configure your college profile first.' });
    }

    const {
      title,
      subtitle,
      description,
      examTarget = 'NEET',
      subject = 'Comprehensive',
      classYear = 'Class 12',
      author,
      category = 'STUDY_MATERIAL',
      fulfillmentType = 'DIGITAL_PDF',
      priceRupees = 199.00,
      mrpRupees = 499.00,
      stockQuantity = 0,
      lowStockThreshold = 10,
      weightGrams = 300,
      sku,
      coverImageUrl,
      fileKey,
      sampleFileKey,
      pageCount = 100,
      requestedScope = 'COLLEGE_ONLY', // 'COLLEGE_ONLY' | 'GLOBAL'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Product title is required.' });
    }

    const validFulfillment = ['DIGITAL_PDF', 'PHYSICAL_PRINT', 'BUNDLE_HYBRID'];
    const resolvedFulfillment = validFulfillment.includes(fulfillmentType) ? fulfillmentType : 'DIGITAL_PDF';

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { name: true, slug: true },
    });

    const isRequestingGlobal = requestedScope === 'GLOBAL';
    const moderationStatus = isRequestingGlobal ? 'SUBMITTED_FOR_REVIEW' : 'DRAFT';
    const isGlobal = false; // Always starts false until Super Admin approves!

    const generatedSku = sku ? sku.trim().toUpperCase() : `SKU-${institute?.slug?.toUpperCase().slice(0, 4) || 'QS'}-${Date.now().toString().slice(-6)}`;

    const newProduct = await prisma.marketplaceBook.create({
      data: {
        sku: generatedSku,
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        description: description ? description.trim() : null,
        examTarget,
        subject,
        classYear,
        author: author ? author.trim() : `${institute?.name || 'College'} Senior Faculty`,
        category,
        fulfillmentType: resolvedFulfillment,
        priceRupees: parseFloat(priceRupees) || 199.00,
        mrpRupees: parseFloat(mrpRupees) || 499.00,
        stockQuantity: parseInt(stockQuantity) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        weightGrams: parseInt(weightGrams) || 300,
        coverImageUrl: coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        fileKey: fileKey || `college_${instituteId}_${Date.now()}.pdf`,
        sampleFileKey: sampleFileKey || null,
        pageCount: parseInt(pageCount) || 100,
        isGlobal,
        moderationStatus,
        instituteId,
        affiliateCommissionPct: 10.0,
      },
      include: {
        institute: { select: { id: true, name: true, slug: true } },
      },
    });

    res.json({
      success: true,
      message: isRequestingGlobal
        ? 'Product submitted for Super Admin review to syndicate globally across all colleges.'
        : 'Product published successfully to your college portal.',
      product: newProduct,
    });
  } catch (err) {
    console.error('Error creating seller product:', err);
    res.status(500).json({ error: 'Failed to create product: ' + err.message });
  }
});

/**
 * PUT /api/marketplace/seller/products/:id
 * College updates an existing product with strict tenant isolation enforcement
 */
router.put('/seller/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.marketplaceBook.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const userInstituteId = await resolveMarketplaceInstituteId(req);

    // Strict tenant isolation: If not platform admin, user MUST own this product
    if (req.user.role !== 'ADMIN') {
      if (!userInstituteId || existing.instituteId !== userInstituteId) {
        return res.status(403).json({ error: 'Unauthorized: You can only edit your own college products.' });
      }
    }

    const {
      title,
      subtitle,
      description,
      examTarget,
      subject,
      classYear,
      author,
      category,
      fulfillmentType,
      priceRupees,
      mrpRupees,
      stockQuantity,
      lowStockThreshold,
      weightGrams,
      sku,
      coverImageUrl,
      sampleFileKey,
      pageCount,
      requestedScope, // 'COLLEGE_ONLY' | 'GLOBAL'
      isActive,
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (subtitle !== undefined) updateData.subtitle = subtitle ? subtitle.trim() : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (examTarget !== undefined) updateData.examTarget = examTarget;
    if (subject !== undefined) updateData.subject = subject;
    if (classYear !== undefined) updateData.classYear = classYear;
    if (author !== undefined) updateData.author = author.trim();
    if (category !== undefined) updateData.category = category;
    if (fulfillmentType !== undefined) {
      const valid = ['DIGITAL_PDF', 'PHYSICAL_PRINT', 'BUNDLE_HYBRID'];
      if (valid.includes(fulfillmentType)) updateData.fulfillmentType = fulfillmentType;
    }
    if (priceRupees !== undefined) updateData.priceRupees = parseFloat(priceRupees) || 199.00;
    if (mrpRupees !== undefined) updateData.mrpRupees = parseFloat(mrpRupees) || 499.00;
    if (stockQuantity !== undefined) updateData.stockQuantity = parseInt(stockQuantity) || 0;
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseInt(lowStockThreshold) || 10;
    if (weightGrams !== undefined) updateData.weightGrams = parseInt(weightGrams) || 300;
    if (sku !== undefined) updateData.sku = sku ? sku.trim().toUpperCase() : existing.sku;
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
    if (sampleFileKey !== undefined) updateData.sampleFileKey = sampleFileKey;
    if (pageCount !== undefined) updateData.pageCount = parseInt(pageCount) || 100;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    // If changing scope or resubmitting after rejection:
    if (requestedScope === 'GLOBAL' && existing.moderationStatus !== 'APPROVED_GLOBAL') {
      updateData.moderationStatus = 'SUBMITTED_FOR_REVIEW';
      updateData.isGlobal = false;
      updateData.rejectionReason = null;
    } else if (requestedScope === 'COLLEGE_ONLY') {
      updateData.moderationStatus = 'DRAFT';
      updateData.isGlobal = false;
    }

    const updated = await prisma.marketplaceBook.update({
      where: { id },
      data: updateData,
      include: {
        institute: { select: { id: true, name: true, slug: true } },
      },
    });

    res.json({
      success: true,
      message: 'Product updated successfully.',
      product: updated,
    });
  } catch (err) {
    console.error('Error updating seller product:', err);
    res.status(500).json({ error: 'Failed to update product: ' + err.message });
  }
});

/**
 * DELETE /api/marketplace/seller/products/:id
 * College deletes their own product with strict tenant isolation enforcement
 */
router.delete('/seller/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.marketplaceBook.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const userInstituteId = await resolveMarketplaceInstituteId(req);

    // Strict tenant isolation:
    if (req.user.role !== 'ADMIN') {
      if (!userInstituteId || existing.instituteId !== userInstituteId) {
        return res.status(403).json({ error: 'Unauthorized: You can only delete your own college products.' });
      }
    }

    await prisma.marketplaceBook.delete({ where: { id } });

    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('Error deleting seller product:', err);
    res.status(500).json({ error: 'Failed to delete product: ' + err.message });
  }
});

// ============================================================================
// 6. SUPER ADMIN MASTER MARKETPLACE COMMAND & MODERATION
// ============================================================================

/**
 * GET /api/marketplace/admin/reconciliation
 * Platform-wide financial report across all participating colleges
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

    // Compute verified transaction counts strictly from actual completed orders
    const verifiedOrderCounts = {};
    for (const order of allOrders) {
      if (order.bookId) {
        verifiedOrderCounts[order.bookId] = (verifiedOrderCounts[order.bookId] || 0) + 1;
      }
    }

    const booksWithVerifiedCounts = allBooks.map((b) => ({
      ...b,
      salesCount: verifiedOrderCounts[b.id] || 0,
      verifiedSalesCount: verifiedOrderCounts[b.id] || 0,
    }));

    res.json({
      success: true,
      summary: {
        totalBooks: allBooks.length,
        masterBooksCount: allBooks.filter((b) => !b.instituteId).length,
        collegeBooksCount: allBooks.filter((b) => b.instituteId).length,
        totalOrders: allOrders.length,
        grossSalesRupees,
        refundsRupees: 0,
        accruedCommissionsRupees: totalCollegePayoutsRupees,
        availableBalancesRupees: totalCollegePayoutsRupees,
        approvedSettlementsRupees: 0,
        completedPayoutsRupees: 0,
        totalCollegePayoutsRupees,
        netPlatformRevenueRupees,
        totalActiveColleges: totalInstitutes,
      },
      orders: allOrders.slice(0, 50),
      books: booksWithVerifiedCounts,
    });
  } catch (err) {
    console.error('Error in admin marketplace reconciliation:', err);
    res.status(500).json({ error: 'Failed to load marketplace reconciliation.' });
  }
});

/**
 * GET /api/marketplace/admin/moderation-queue
 * Super Admin retrieves all college publications submitted for global syndication
 */
router.get('/admin/moderation-queue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const queue = await prisma.marketplaceBook.findMany({
      where: {
        moderationStatus: 'SUBMITTED_FOR_REVIEW',
      },
      include: {
        institute: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            address: true,
            website: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // FIFO queue
    });

    res.json({
      success: true,
      count: queue.length,
      queue,
    });
  } catch (err) {
    console.error('Error fetching moderation queue:', err);
    res.status(500).json({ error: 'Failed to load moderation queue: ' + err.message });
  }
});

/**
 * POST /api/marketplace/admin/moderate/:id
 * Super Admin approves or rejects a college publication
 */
router.post('/admin/moderate/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either APPROVE or REJECT.' });
    }

    const book = await prisma.marketplaceBook.findUnique({
      where: { id },
      include: { institute: { select: { id: true, name: true, slug: true } } },
    });

    if (!book) {
      return res.status(404).json({ error: 'Publication not found.' });
    }

    if (action === 'APPROVE') {
      const updated = await prisma.marketplaceBook.update({
        where: { id },
        data: {
          isGlobal: true,
          moderationStatus: 'APPROVED_GLOBAL',
          rejectionReason: null,
          reviewedAt: new Date(),
        },
        include: { institute: { select: { id: true, name: true, slug: true } } },
      });

      return res.json({
        success: true,
        action: 'APPROVE',
        message: `Book "${updated.title}" approved and syndicated globally across all college storefronts.`,
        book: updated,
      });
    }

    if (action === 'REJECT') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({ error: 'Rejection reason is required when rejecting a submission.' });
      }

      const updated = await prisma.marketplaceBook.update({
        where: { id },
        data: {
          isGlobal: false,
          moderationStatus: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
          reviewedAt: new Date(),
        },
        include: { institute: { select: { id: true, name: true, slug: true } } },
      });

      return res.json({
        success: true,
        action: 'REJECT',
        message: `Book "${updated.title}" rejected and returned to college with feedback.`,
        book: updated,
      });
    }
  } catch (err) {
    console.error('Error moderating book:', err);
    res.status(500).json({ error: 'Failed to moderate publication: ' + err.message });
  }
});

/**
 * POST /api/marketplace/admin/upload-master-book
 * Super Admin creates a master publication syndicated to ALL 800 college sites
 */
router.post('/admin/upload-master-book', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      sku,
      title,
      subtitle,
      description,
      examTarget = 'NEET',
      subject = 'Comprehensive',
      classYear = 'Class 12',
      author = 'QuestionStudio Academic Editorial Board',
      priceRupees = 199.00,
      mrpRupees = 499.00,
      fulfillmentType = 'DIGITAL_PDF',
      stockQuantity = 0,
      lowStockThreshold = 10,
      weightGrams = 300,
      coverImageUrl,
      category = 'FORMULA_BOOK',
      pageCount = 160,
    } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Book title is required.' });

    const generatedSku = sku ? sku.trim().toUpperCase() : `MASTER-${Date.now().toString().slice(-6)}`;

    const masterBook = await prisma.marketplaceBook.create({
      data: {
        sku: generatedSku,
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        description: description ? description.trim() : null,
        examTarget,
        subject,
        classYear,
        author: author.trim(),
        category,
        fulfillmentType: ['DIGITAL_PDF', 'PHYSICAL_PRINT', 'BUNDLE_HYBRID'].includes(fulfillmentType) ? fulfillmentType : 'DIGITAL_PDF',
        stockQuantity: parseInt(stockQuantity) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        weightGrams: parseInt(weightGrams) || 300,
        priceRupees: parseFloat(priceRupees) || 199.00,
        mrpRupees: parseFloat(mrpRupees) || 499.00,
        coverImageUrl: coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
        fileKey: `master_${Date.now()}.pdf`,
        sampleFileKey: `preview_master_${Date.now()}.pdf`,
        pageCount: parseInt(pageCount) || 160,
        isGlobal: true, // Syndicates to ALL 800 colleges!
        moderationStatus: 'APPROVED_GLOBAL',
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

// ============================================================================
// 7. ASSET UPLOADS & BOOK LIFECYCLE MANAGEMENT (EDIT / DELETE)
// ============================================================================

/**
 * POST /api/marketplace/upload-cover
 * Uploads a book cover image file (up to 8MB)
 */
router.post('/upload-cover', requireAuth, coverUpload.single('coverImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const imageUrl = `/uploads/marketplace/covers/${req.file.filename}`;
    res.json({ ok: true, imageUrl, filename: req.file.filename });
  } catch (err) {
    console.error('Error uploading book cover:', err);
    res.status(500).json({ error: err.message || 'Failed to upload cover image' });
  }
});

/**
 * POST /api/marketplace/upload-pdf
 * Uploads a book PDF file (up to 60MB)
 */
router.post('/upload-pdf', requireAuth, pdfUpload.single('bookPdf'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    res.json({ ok: true, fileKey: req.file.filename, sizeBytes: req.file.size });
  } catch (err) {
    console.error('Error uploading book PDF:', err);
    res.status(500).json({ error: err.message || 'Failed to upload PDF' });
  }
});

/**
 * PUT /api/marketplace/admin/book/:id
 * Super Admin edits an existing master publication
 */
router.put('/admin/book/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sku,
      title,
      subtitle,
      description,
      examTarget,
      subject,
      classYear,
      author,
      priceRupees,
      mrpRupees,
      fulfillmentType,
      stockQuantity,
      lowStockThreshold,
      weightGrams,
      coverImageUrl,
      category,
      pageCount,
      sampleFileKey,
      isActive,
      isFeatured,
    } = req.body;

    const updated = await prisma.marketplaceBook.update({
      where: { id },
      data: {
        ...(sku !== undefined && { sku: sku ? sku.trim().toUpperCase() : null }),
        ...(title && { title: title.trim() }),
        ...(subtitle !== undefined && { subtitle: subtitle ? subtitle.trim() : null }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(examTarget && { examTarget }),
        ...(subject && { subject }),
        ...(classYear && { classYear }),
        ...(author && { author: author.trim() }),
        ...(category && { category }),
        ...(fulfillmentType && { fulfillmentType }),
        ...(stockQuantity !== undefined && { stockQuantity: parseInt(stockQuantity) || 0 }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold: parseInt(lowStockThreshold) || 10 }),
        ...(weightGrams !== undefined && { weightGrams: parseInt(weightGrams) || 300 }),
        ...(priceRupees !== undefined && { priceRupees: parseFloat(priceRupees) || 199 }),
        ...(mrpRupees !== undefined && { mrpRupees: parseFloat(mrpRupees) || 499 }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(sampleFileKey !== undefined && { sampleFileKey }),
        ...(pageCount !== undefined && { pageCount: parseInt(pageCount) || 160 }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
      },
    });

    res.json({ success: true, book: updated });
  } catch (err) {
    console.error('Error updating master book:', err);
    res.status(500).json({ error: 'Failed to update publication: ' + err.message });
  }
});

/**
 * DELETE /api/marketplace/admin/book/:id
 * Super Admin deletes or archives a master book
 */
router.delete('/admin/book/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.marketplaceBook.delete({ where: { id } });
    res.json({ success: true, message: 'Publication deleted successfully.' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Failed to delete publication: ' + err.message });
  }
});

/**
 * PUT /api/marketplace/institute/book/:id
 * College edits their own uploaded study material
 */
router.put('/institute/book/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.marketplaceBook.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Publication not found' });

    const userInstituteId = await resolveMarketplaceInstituteId(req);
    if (req.user.role !== 'ADMIN' && (!userInstituteId || existing.instituteId !== userInstituteId)) {
      return res.status(403).json({ error: 'Unauthorized: You can only edit your own college publications.' });
    }

    const {
      title,
      subtitle,
      description,
      examTarget,
      subject,
      classYear,
      priceRupees,
      mrpRupees,
      fulfillmentType,
      stockQuantity,
      coverImageUrl,
      category,
      pageCount,
    } = req.body;

    const updated = await prisma.marketplaceBook.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(subtitle !== undefined && { subtitle: subtitle ? subtitle.trim() : null }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(examTarget && { examTarget }),
        ...(subject && { subject }),
        ...(classYear && { classYear }),
        ...(category && { category }),
        ...(fulfillmentType && { fulfillmentType }),
        ...(stockQuantity !== undefined && { stockQuantity: parseInt(stockQuantity) || 0 }),
        ...(priceRupees !== undefined && { priceRupees: parseFloat(priceRupees) || 199 }),
        ...(mrpRupees !== undefined && { mrpRupees: parseFloat(mrpRupees) || 499 }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(pageCount !== undefined && { pageCount: parseInt(pageCount) || 120 }),
      },
    });

    res.json({ success: true, book: updated });
  } catch (err) {
    console.error('Error updating college material:', err);
    res.status(500).json({ error: 'Failed to update study material: ' + err.message });
  }
});

/**
 * DELETE /api/marketplace/institute/book/:id
 * College deletes their own material
 */
router.delete('/institute/book/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.marketplaceBook.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Publication not found' });

    const userInstituteId = await resolveMarketplaceInstituteId(req);
    if (req.user.role !== 'ADMIN' && (!userInstituteId || existing.instituteId !== userInstituteId)) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own college publications.' });
    }

    await prisma.marketplaceBook.delete({ where: { id } });
    res.json({ success: true, message: 'Study material removed successfully.' });
  } catch (err) {
    console.error('Error deleting college material:', err);
    res.status(500).json({ error: 'Failed to delete study material: ' + err.message });
  }
});

module.exports = router;
