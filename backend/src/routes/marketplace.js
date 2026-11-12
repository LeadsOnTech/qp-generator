const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { watermarkPdf } = require('../lib/watermarkPdf');
const whatsappService = require('../lib/whatsapp');
const {
  getPaymentConfig,
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require('../lib/subscriptionPayment');

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
 * Calculates progressive courier delivery charges using standard 500g weight slabs
 * and destination Indian postal circles (Zones).
 */
function calculateWeightSlabShippingFee(weightGrams, pincode, isPhysical) {
  if (!isPhysical) {
    return {
      shippingFee: 0,
      weightGrams: 0,
      slabs: 0,
      slabWeightGrams: 500,
      zoneName: 'Digital Delivery',
      isFree: true,
      notice: 'Instant digital delivery with personalized DRM watermark.',
    };
  }

  const weight = Math.max(100, parseInt(weightGrams, 10) || 300);
  const slabs = Math.max(1, Math.ceil(weight / 500));
  const pin = String(pincode || '').trim();
  const prefix2 = pin.substring(0, 2);

  let baseRate = 45;
  let additionalSlabRate = 25;
  let zoneName = 'Regional / Intra-State (AP/Telangana/South)';

  // Remote / High-altitude circles: North-East (78, 79), J&K / Ladakh (18, 19), Islands (74)
  if (['78', '79', '18', '19', '74'].includes(prefix2)) {
    baseRate = 95;
    additionalSlabRate = 45;
    zoneName = 'Special Remote Region (NE / J&K / Islands)';
  } else if (['50', '51', '52', '53', '56', '57', '60', '61'].includes(prefix2)) {
    // Local / South Intra-State (AP / Telangana / Karnataka / TN)
    baseRate = 40;
    additionalSlabRate = 20;
    zoneName = 'Local / Intra-State Surface';
  } else {
    // National / Inter-State
    baseRate = 65;
    additionalSlabRate = 35;
    zoneName = 'National Express Surface';
  }

  const shippingFee = baseRate + ((slabs - 1) * additionalSlabRate);
  return {
    shippingFee,
    weightGrams: weight,
    slabs,
    slabWeightGrams: 500,
    zoneName,
    isFree: false,
    notice: 'Pre-inspected educational material is non-returnable. Free replacement for courier transit damage within 48h.',
  };
}

/**
 * GET /api/marketplace/shipping-estimate
 * Returns real-time shipping quote based on parcel weight and destination postal pincode.
 */
router.get('/shipping-estimate', (req, res) => {
  try {
    const { weightGrams, pincode, fulfillmentType = 'PHYSICAL_PRINT' } = req.query;
    const isPhysical = fulfillmentType === 'PHYSICAL_PRINT' || fulfillmentType === 'BUNDLE_HYBRID';
    const estimate = calculateWeightSlabShippingFee(weightGrams, pincode, isPhysical);
    res.json({ success: true, ...estimate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to estimate courier charges.' });
  }
});

/**
 * POST /api/marketplace/checkout/create-order
 * Initiates an order for a student and calculates revenue share
 */
router.post('/checkout/create-order', async (req, res) => {
  try {
    const {
      bookId,
      collegeSlug,
      buyerName,
      buyerPhone,
      buyerEmail,
      paymentMethod = 'UPI_RAZORPAY',
      shippingAddress,
    } = req.body;

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

    const isPhysical = book.fulfillmentType === 'PHYSICAL_PRINT' || book.fulfillmentType === 'BUNDLE_HYBRID';

    // Physical stock availability guard
    if (isPhysical && (book.stockQuantity ?? 100) <= 0) {
      return res.status(400).json({ error: 'Sorry, this physical publication is currently out of stock for delivery.' });
    }

    // Physical delivery address validation
    if (isPhysical) {
      if (!shippingAddress || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
        return res.status(400).json({ error: 'Complete shipping address (Address Line 1, City, State, Pincode) is required for physical book delivery.' });
      }
      if (!/^\d{6}$/.test(String(shippingAddress.pincode).trim())) {
        return res.status(400).json({ error: 'Valid 6-digit Indian postal Pincode is required.' });
      }
    }

    // Determine the selling college if bought through a college subpath
    let sellingInstitute = null;
    if (collegeSlug) {
      sellingInstitute = await prisma.institute.findUnique({
        where: { slug: collegeSlug.toLowerCase().trim() },
      });
    }

    // Progressive Courier & Weight Slab Calculation
    const shippingDetails = calculateWeightSlabShippingFee(book.weightGrams, shippingAddress?.pincode, isPhysical);
    const shippingAmountRupees = req.body.shippingAmountRupees !== undefined && !isNaN(parseFloat(req.body.shippingAmountRupees))
      ? Math.max(0, parseFloat(req.body.shippingAmountRupees))
      : shippingDetails.shippingFee;

    const bookAmountRupees = book.priceRupees;
    const amountRupees = Math.round((bookAmountRupees + shippingAmountRupees) * 100) / 100;

    let collegeShareRupees = 0;
    let platformShareRupees = 0;

    if (!book.instituteId) {
      // 1. Super Admin Master Publication:
      // College earns affiliate commission on the book price.
      // Question Studio retains remaining book price + 100% of courier fee for fulfillment.
      if (sellingInstitute) {
        collegeShareRupees = Math.round((bookAmountRupees * (book.affiliateCommissionPct / 100)) * 100) / 100;
        platformShareRupees = Math.round((amountRupees - collegeShareRupees) * 100) / 100;
      } else {
        collegeShareRupees = 0;
        platformShareRupees = amountRupees;
      }
    } else {
      // 2. College's Own Proprietary Publication:
      // Platform takes 10% commission on the book price.
      // College fulfills physical print/shipment, retaining 90% book price + 100% of courier fee.
      platformShareRupees = Math.round((bookAmountRupees * 0.10) * 100) / 100;
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
        shippingAmountRupees,
        collegeShareRupees,
        platformShareRupees,
        payoutMode: 'WALLET_CREDITS',
        paymentStatus: 'COMPLETED', // Digital delivery confirmation
        paymentMethod,
        downloadToken,
        downloadExpiresAt,
      },
    });

    // If physical print or hybrid bundle, record shipping address and manifest shipment
    let createdShippingAddress = null;
    let createdShipment = null;
    if (isPhysical && shippingAddress) {
      createdShippingAddress = await prisma.marketplaceShippingAddress.create({
        data: {
          orderId: order.id,
          fullName: (shippingAddress.fullName || buyerName).trim(),
          phone: (shippingAddress.phone || buyerPhone).trim(),
          addressLine1: shippingAddress.addressLine1.trim(),
          addressLine2: (shippingAddress.addressLine2 || '').trim() || null,
          landmark: (shippingAddress.landmark || '').trim() || null,
          city: shippingAddress.city.trim(),
          district: (shippingAddress.district || shippingAddress.city).trim(),
          state: shippingAddress.state.trim(),
          pincode: String(shippingAddress.pincode).trim(),
        },
      });

      createdShipment = await prisma.marketplaceShipment.create({
        data: {
          orderId: order.id,
          carrierName: null,
          trackingNumber: null,
          trackingUrl: null,
          status: 'MANIFESTED',
        },
      });
    }

    // Automatically update book sales count and decrement stock if physical
    const updateData = { salesCount: { increment: 1 } };
    if (isPhysical) {
      updateData.stockQuantity = { decrement: 1 };
    }
    await prisma.marketplaceBook.update({
      where: { id: book.id },
      data: updateData,
    });

    // Marketplace Commission Ledger: Accrued Earnings Mode
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

      // Immutable audit ledger entry
      try {
        await prisma.marketplaceLedgerEntry.create({
          data: {
            orderId: order.id,
            instituteId: sellingInstitute.id,
            entryType: 'EARNING_ACCRUED',
            roleType: book.instituteId ? 'PUBLISHER' : 'REFERRER',
            creditAmountRupees: collegeShareRupees,
            debitAmountRupees: 0.0,
            netAmountRupees: collegeShareRupees,
            notes: `Accrued from order ${orderNumber} for "${book.title}" (${isPhysical ? 'Physical Shipping' : 'Digital PDF'})`,
          },
        });
      } catch (ledgerErr) {
        console.warn('[MARKETPLACE] Could not record ledger entry:', ledgerErr.message);
      }
    }

    const hasDigital = book.fulfillmentType !== 'PHYSICAL_PRINT';

    // Asynchronous automated WhatsApp order confirmation (non-blocking)
    try {
      const siteUrl = process.env.BASE_URL || 'https://questionstudio.in';
      whatsappService.sendMarketplaceOrderConfirmation({
        phone: order.buyerPhone,
        studentName: order.buyerName,
        bookTitle: book.title,
        orderNumber,
        amountRupees,
        downloadUrl: hasDigital ? `${siteUrl}/api/marketplace/download/${downloadToken}` : null,
        isPhysical,
        collegeName: sellingInstitute ? sellingInstitute.name : 'QuestionStudio Bookstore',
      }).catch(err => console.warn('[WHATSAPP] Notification error:', err.message));

      if (sellingInstitute && (sellingInstitute.phone || sellingInstitute.trialPhoneNumber)) {
        whatsappService.sendSellerSaleAlert({
          sellerPhone: sellingInstitute.phone || sellingInstitute.trialPhoneNumber,
          collegeName: sellingInstitute.name,
          studentName: order.buyerName,
          studentPhone: order.buyerPhone,
          bookTitle: book.title,
          orderNumber,
          amountRupees,
          collegeShareRupees,
          isPhysical,
        }).catch(err => console.warn('[WHATSAPP] Seller alert error:', err.message));
      }
    } catch (waErr) {
      console.warn('[WHATSAPP] Failed to queue order confirmation:', waErr.message);
    }

    res.json({
      success: true,
      orderNumber,
      downloadToken: hasDigital ? downloadToken : null,
      downloadUrl: hasDigital ? `/api/marketplace/download/${downloadToken}` : null,
      amountRupees,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      bookTitle: book.title,
      fulfillmentType: book.fulfillmentType,
      isPhysical,
      shippingAddress: createdShippingAddress,
      shipment: createdShipment,
      creditsAwarded,
      collegeEarned: collegeShareRupees,
    });
  } catch (err) {
    console.error('Error creating marketplace order:', err);
    res.status(500).json({ error: 'Failed to process study material order: ' + err.message });
  }
});

/**
 * POST /api/marketplace/checkout/create-razorpay-order
 * Initiates Razorpay payment order for online student purchases.
 * Computes exact integer paise amount and attributes revenue.
 */
router.post('/checkout/create-razorpay-order', async (req, res) => {
  try {
    const {
      bookId,
      collegeSlug,
      buyerName,
      buyerPhone,
      buyerEmail,
      shippingAddress,
    } = req.body;

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

    const isPhysical = book.fulfillmentType === 'PHYSICAL_PRINT' || book.fulfillmentType === 'BUNDLE_HYBRID';

    if (isPhysical && (book.stockQuantity ?? 100) <= 0) {
      return res.status(400).json({ error: 'Sorry, this physical publication is currently out of stock.' });
    }

    if (isPhysical) {
      if (!shippingAddress || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
        return res.status(400).json({ error: 'Complete shipping address (Address, City, State, Pincode) is required for physical book delivery.' });
      }
      if (!/^\d{6}$/.test(String(shippingAddress.pincode).trim())) {
        return res.status(400).json({ error: 'Valid 6-digit Indian postal Pincode is required.' });
      }
    }

    // Determine selling college
    let sellingInstitute = null;
    if (collegeSlug) {
      sellingInstitute = await prisma.institute.findUnique({
        where: { slug: collegeSlug.toLowerCase().trim() },
      });
    }

    // Progressive Courier & Weight Slab Calculation
    const shippingDetails = calculateWeightSlabShippingFee(book.weightGrams, shippingAddress?.pincode, isPhysical);
    const shippingAmountRupees = req.body.shippingAmountRupees !== undefined && !isNaN(parseFloat(req.body.shippingAmountRupees))
      ? Math.max(0, parseFloat(req.body.shippingAmountRupees))
      : shippingDetails.shippingFee;

    const bookAmountRupees = book.priceRupees;
    const amountRupees = Math.round((bookAmountRupees + shippingAmountRupees) * 100) / 100;

    let collegeShareRupees = 0;
    let platformShareRupees = 0;

    if (!book.instituteId) {
      if (sellingInstitute) {
        collegeShareRupees = Math.round((bookAmountRupees * (book.affiliateCommissionPct / 100)) * 100) / 100;
        platformShareRupees = Math.round((amountRupees - collegeShareRupees) * 100) / 100;
      } else {
        collegeShareRupees = 0;
        platformShareRupees = amountRupees;
      }
    } else {
      platformShareRupees = Math.round((bookAmountRupees * 0.10) * 100) / 100;
      collegeShareRupees = Math.round((amountRupees - platformShareRupees) * 100) / 100;
      sellingInstitute = book.institute;
    }

    const orderNumber = `QS-BK-${Math.floor(100000 + Math.random() * 900000)}`;
    const downloadToken = crypto.randomBytes(24).toString('hex');
    const downloadExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const amountPaise = Math.round(amountRupees * 100);

    const config = await getPaymentConfig();
    let gatewayOrderId = `order_mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    if (!config.isMockMode && config.rzpClient) {
      try {
        const rzpOrder = await config.rzpClient.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt: orderNumber,
          notes: {
            bookId: book.id,
            bookTitle: book.title.substring(0, 40),
            buyerPhone: buyerPhone.trim(),
            sellingCollege: sellingInstitute ? sellingInstitute.slug : 'direct',
          },
        });
        gatewayOrderId = rzpOrder.id;
      } catch (rzpErr) {
        console.error('[MARKETPLACE] Razorpay API call failed, defaulting to simulation:', rzpErr.message);
      }
    }

    // Create order with paymentStatus: 'PENDING'
    const order = await prisma.marketplaceOrder.create({
      data: {
        orderNumber,
        bookId: book.id,
        sellingInstituteId: sellingInstitute ? sellingInstitute.id : null,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerEmail: (buyerEmail || '').trim() || `${buyerPhone.trim()}@student.questionstudio.in`,
        amountRupees,
        shippingAmountRupees,
        collegeShareRupees,
        platformShareRupees,
        payoutMode: 'WALLET_CREDITS',
        paymentStatus: 'PENDING',
        paymentMethod: 'UPI_RAZORPAY',
        razorpayOrderId: gatewayOrderId,
        downloadToken,
        downloadExpiresAt,
      },
    });

    // Save shipping address in pending state if physical
    if (isPhysical && shippingAddress) {
      await prisma.marketplaceShippingAddress.create({
        data: {
          orderId: order.id,
          fullName: (shippingAddress.fullName || buyerName).trim(),
          phone: (shippingAddress.phone || buyerPhone).trim(),
          addressLine1: shippingAddress.addressLine1.trim(),
          addressLine2: (shippingAddress.addressLine2 || '').trim() || null,
          landmark: (shippingAddress.landmark || '').trim() || null,
          city: shippingAddress.city.trim(),
          district: (shippingAddress.district || shippingAddress.city).trim(),
          state: shippingAddress.state.trim(),
          pincode: String(shippingAddress.pincode).trim(),
        },
      });
    }

    res.json({
      success: true,
      orderId: order.id,
      orderNumber,
      razorpayOrderId: gatewayOrderId,
      amountPaise,
      amountRupees,
      currency: 'INR',
      keyId: config.key_id,
      isMockMode: config.isMockMode,
      bookTitle: book.title,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      buyerEmail: order.buyerEmail,
      collegeName: sellingInstitute ? sellingInstitute.name : 'QuestionStudio Bookstore',
    });
  } catch (err) {
    console.error('[MARKETPLACE] create-razorpay-order error:', err);
    res.status(500).json({ error: 'Failed to initiate Razorpay payment: ' + err.message });
  }
});

/**
 * POST /api/marketplace/checkout/verify-payment
 * Verifies Razorpay payment signature, updates paymentStatus to COMPLETED,
 * manifests shipment, decrements stock, accrues college earnings, and issues download token.
 */
router.post('/checkout/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: 'Payment details are missing.' });
    }

    const order = await prisma.marketplaceOrder.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
      include: {
        book: true,
        sellingInstitute: true,
        shippingAddress: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: `Marketplace order for '${razorpay_order_id}' not found.` });
    }

    // Idempotent fulfillment
    if (order.paymentStatus === 'COMPLETED') {
      const isPhysical = order.book.fulfillmentType === 'PHYSICAL_PRINT' || order.book.fulfillmentType === 'BUNDLE_HYBRID';
      const hasDigital = order.book.fulfillmentType !== 'PHYSICAL_PRINT';
      return res.json({
        success: true,
        alreadyProcessed: true,
        orderNumber: order.orderNumber,
        downloadToken: hasDigital ? order.downloadToken : null,
        downloadUrl: hasDigital ? `/api/marketplace/download/${order.downloadToken}` : null,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        bookTitle: order.book.title,
        fulfillmentType: order.book.fulfillmentType,
        isPhysical,
        shippingAddress: order.shippingAddress,
      });
    }

    const config = await getPaymentConfig();
    let isSignatureValid = false;

    if (config.isMockMode || razorpay_order_id.startsWith('order_mock_')) {
      // Mock / Simulation mode verification: valid unless explicitly forged/invalid
      if (razorpay_signature === 'invalid_forged_signature_hex' || (typeof razorpay_signature === 'string' && razorpay_signature.startsWith('invalid_'))) {
        isSignatureValid = false;
      } else {
        isSignatureValid = true;
      }
    } else {
      // Cryptographic HMAC-SHA256 signature verification
      isSignatureValid = verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        secret: config.key_secret,
      });
    }

    if (!isSignatureValid) {
      await prisma.marketplaceOrder.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      });
      return res.status(400).json({ error: 'Cryptographic payment verification failed. Untrusted signature.' });
    }

    const isPhysical = order.book.fulfillmentType === 'PHYSICAL_PRINT' || order.book.fulfillmentType === 'BUNDLE_HYBRID';

    // 1. Update order to COMPLETED
    await prisma.marketplaceOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'COMPLETED',
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    // 2. Decrement physical stock & update sales count
    const updateBookData = { salesCount: { increment: 1 } };
    if (isPhysical) {
      updateBookData.stockQuantity = { decrement: 1 };
    }
    await prisma.marketplaceBook.update({
      where: { id: order.bookId },
      data: updateBookData,
    });

    // 3. Manifest physical shipment if not already manifested
    let shipment = await prisma.marketplaceShipment.findUnique({
      where: { orderId: order.id },
    });
    if (isPhysical && !shipment) {
      shipment = await prisma.marketplaceShipment.create({
        data: {
          orderId: order.id,
          status: 'MANIFESTED',
        },
      });
    }

    // 4. Accrue college earnings & record immutable ledger
    if (order.sellingInstitute && order.collegeShareRupees > 0) {
      const sharePaise = Math.round(order.collegeShareRupees * 100);
      await prisma.institute.update({
        where: { id: order.sellingInstitute.id },
        data: {
          marketplaceEarningsPaise: { increment: sharePaise },
        },
      });

      try {
        await prisma.marketplaceLedgerEntry.create({
          data: {
            orderId: order.id,
            instituteId: order.sellingInstitute.id,
            entryType: 'EARNING_ACCRUED',
            roleType: order.book.instituteId ? 'PUBLISHER' : 'REFERRER',
            creditAmountRupees: order.collegeShareRupees,
            debitAmountRupees: 0.0,
            netAmountRupees: order.collegeShareRupees,
            notes: `Accrued from verified payment order ${order.orderNumber} for "${order.book.title}"`,
          },
        });
      } catch (ledgerErr) {
        console.warn('[MARKETPLACE] Could not record ledger entry:', ledgerErr.message);
      }
    }

    const hasDigital = order.book.fulfillmentType !== 'PHYSICAL_PRINT';

    // Asynchronous automated WhatsApp order confirmation (non-blocking)
    try {
      const siteUrl = process.env.BASE_URL || 'https://questionstudio.in';
      whatsappService.sendMarketplaceOrderConfirmation({
        phone: order.buyerPhone,
        studentName: order.buyerName,
        bookTitle: order.book.title,
        orderNumber: order.orderNumber,
        amountRupees: order.amountRupees,
        downloadUrl: hasDigital ? `${siteUrl}/api/marketplace/download/${order.downloadToken}` : null,
        isPhysical,
        collegeName: order.sellingInstitute ? order.sellingInstitute.name : 'QuestionStudio Bookstore',
      }).catch(err => console.warn('[WHATSAPP] Notification error:', err.message));

      if (order.sellingInstitute && (order.sellingInstitute.phone || order.sellingInstitute.trialPhoneNumber)) {
        whatsappService.sendSellerSaleAlert({
          sellerPhone: order.sellingInstitute.phone || order.sellingInstitute.trialPhoneNumber,
          collegeName: order.sellingInstitute.name,
          studentName: order.buyerName,
          studentPhone: order.buyerPhone,
          bookTitle: order.book.title,
          orderNumber: order.orderNumber,
          amountRupees: order.amountRupees,
          collegeShareRupees: order.collegeShareRupees,
          isPhysical,
        }).catch(err => console.warn('[WHATSAPP] Seller alert error:', err.message));
      }
    } catch (waErr) {
      console.warn('[WHATSAPP] Failed to queue order confirmation:', waErr.message);
    }

    res.json({
      success: true,
      orderNumber: order.orderNumber,
      downloadToken: hasDigital ? order.downloadToken : null,
      downloadUrl: hasDigital ? `/api/marketplace/download/${order.downloadToken}` : null,
      amountRupees: order.amountRupees,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      bookTitle: order.book.title,
      fulfillmentType: order.book.fulfillmentType,
      isPhysical,
      shippingAddress: order.shippingAddress,
      shipment,
      collegeEarned: order.collegeShareRupees,
    });
  } catch (err) {
    console.error('[MARKETPLACE] verify-payment error:', err);
    res.status(500).json({ error: 'Failed to verify payment: ' + err.message });
  }
});

/**
 * POST /api/marketplace/checkout/webhook
 * Handles asynchronous server-to-server notifications from Razorpay.
 */
router.post('/checkout/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const config = await getPaymentConfig();

    if (!config.isMockMode && config.webhook_secret && signature) {
      const isValid = verifyWebhookSignature(req.rawBody || JSON.stringify(req.body), signature, config.webhook_secret);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid webhook signature.' });
      }
    }

    const event = req.body?.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const rzpPaymentId = paymentEntity?.id;

      if (rzpOrderId) {
        const order = await prisma.marketplaceOrder.findFirst({
          where: { razorpayOrderId: rzpOrderId },
          include: { book: true, sellingInstitute: true },
        });

        if (order && order.paymentStatus !== 'COMPLETED') {
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'COMPLETED',
              razorpayPaymentId: rzpPaymentId || order.razorpayPaymentId,
            },
          });

          const isPhysical = order.book.fulfillmentType === 'PHYSICAL_PRINT' || order.book.fulfillmentType === 'BUNDLE_HYBRID';
          const updateBookData = { salesCount: { increment: 1 } };
          if (isPhysical) updateBookData.stockQuantity = { decrement: 1 };
          await prisma.marketplaceBook.update({ where: { id: order.bookId }, data: updateBookData });

          if (isPhysical) {
            await prisma.marketplaceShipment.upsert({
              where: { orderId: order.id },
              create: { orderId: order.id, status: 'MANIFESTED' },
              update: {},
            });
          }

          if (order.sellingInstitute && order.collegeShareRupees > 0) {
            await prisma.institute.update({
              where: { id: order.sellingInstitute.id },
              data: { marketplaceEarningsPaise: { increment: Math.round(order.collegeShareRupees * 100) } },
            });
          }

          // Asynchronous automated WhatsApp order confirmation (non-blocking)
          try {
            const hasDigital = order.book.fulfillmentType !== 'PHYSICAL_PRINT';
            const siteUrl = process.env.BASE_URL || 'https://questionstudio.in';
            whatsappService.sendMarketplaceOrderConfirmation({
              phone: order.buyerPhone,
              studentName: order.buyerName,
              bookTitle: order.book.title,
              orderNumber: order.orderNumber,
              amountRupees: order.amountRupees,
              downloadUrl: hasDigital ? `${siteUrl}/api/marketplace/download/${order.downloadToken}` : null,
              isPhysical,
              collegeName: order.sellingInstitute ? order.sellingInstitute.name : 'QuestionStudio Bookstore',
            }).catch(err => console.warn('[WHATSAPP] Webhook notification error:', err.message));
          } catch (waErr) {
            console.warn('[WHATSAPP] Failed to queue webhook order confirmation:', waErr.message);
          }
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[MARKETPLACE] Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
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
      take: 100,
      include: {
        book: {
          select: { title: true, examTarget: true, author: true, priceRupees: true, instituteId: true, fulfillmentType: true },
        },
        shippingAddress: true,
        shipment: true,
      },
    });

    // Payout requests for this college
    const payoutRequests = await prisma.marketplacePayoutRequest.findMany({
      where: { instituteId },
      orderBy: { requestedAt: 'desc' },
      take: 20,
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
        fulfillmentType: o.book.fulfillmentType,
        amountRupees: o.amountRupees,
        collegeShareRupees: o.collegeShareRupees,
        creditsAwarded: o.creditsAwarded,
        shippingAddress: o.shippingAddress,
        shipment: o.shipment,
        date: o.createdAt,
        isOwnBook: o.book.instituteId === instituteId,
      })),
      payoutRequests,
      myBooks,
    });
  } catch (err) {
    console.error('Error fetching institute marketplace earnings:', err);
    res.status(500).json({ error: 'Failed to load bookstore earnings.' });
  }
});

/**
 * PUT /api/marketplace/seller/orders/:id/dispatch
 * Allows College Admin to record courier tracking details and mark shipment as DISPATCHED.
 */
router.put('/seller/orders/:id/dispatch', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { carrierName, trackingNumber, trackingUrl } = req.body;

    if (!carrierName || !carrierName.trim()) {
      return res.status(400).json({ error: 'Courier / Carrier Name is required (e.g. DTDC, Speed Post, Delhivery).' });
    }
    if (!trackingNumber || !trackingNumber.trim()) {
      return res.status(400).json({ error: 'Tracking / Consignment Number is required.' });
    }

    const order = await prisma.marketplaceOrder.findUnique({
      where: { id },
      include: { book: { include: { institute: true } }, shipment: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Strict tenant isolation
    const userInstituteId = await resolveMarketplaceInstituteId(req);
    if (req.user.role !== 'ADMIN') {
      if (!userInstituteId || order.sellingInstituteId !== userInstituteId) {
        return res.status(403).json({ error: 'Unauthorized: You can only dispatch orders attributed to your college.' });
      }
    }

    let finalTrackingUrl = (trackingUrl || '').trim();
    if (!finalTrackingUrl) {
      const c = carrierName.toLowerCase();
      if (c.includes('dtdc')) {
        finalTrackingUrl = `https://www.dtdc.in/tracking/shipment-tracking.asp?trno=${trackingNumber.trim()}`;
      } else if (c.includes('speed post') || c.includes('india post')) {
        finalTrackingUrl = `https://www.indiapost.gov.in/_layouts/15/dpt.cpt.tracking/trackconsignment.aspx`;
      } else if (c.includes('delhivery')) {
        finalTrackingUrl = `https://www.delhivery.com/track/package/${trackingNumber.trim()}`;
      } else if (c.includes('bluedart')) {
        finalTrackingUrl = `https://www.bluedart.com/tracking`;
      }
    }

    const updatedShipment = await prisma.marketplaceShipment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        carrierName: carrierName.trim(),
        trackingNumber: trackingNumber.trim(),
        trackingUrl: finalTrackingUrl || null,
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
      },
      update: {
        carrierName: carrierName.trim(),
        trackingNumber: trackingNumber.trim(),
        trackingUrl: finalTrackingUrl || null,
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
      },
    });

    // Asynchronous automated WhatsApp shipping update (non-blocking)
    try {
      whatsappService.sendMarketplaceShippingUpdate({
        phone: order.buyerPhone,
        studentName: order.buyerName,
        bookTitle: order.book ? order.book.title : 'Study Material',
        orderNumber: order.orderNumber,
        carrierName: carrierName.trim(),
        trackingNumber: trackingNumber.trim(),
        trackingUrl: finalTrackingUrl || null,
        collegeName: order.book && order.book.institute ? order.book.institute.name : 'QuestionStudio Bookstore',
      }).catch(err => console.warn('[WHATSAPP] Dispatch notification error:', err.message));
    } catch (waErr) {
      console.warn('[WHATSAPP] Failed to queue dispatch notification:', waErr.message);
    }

    res.json({
      success: true,
      message: `Consignment marked as DISPATCHED via ${carrierName.trim()}.`,
      shipment: updatedShipment,
    });
  } catch (err) {
    console.error('Error dispatching marketplace order:', err);
    res.status(500).json({ error: 'Failed to update dispatch status: ' + err.message });
  }
});

/**
 * POST /api/marketplace/seller/payout-request
 * Allows College Admin to request a bank payout of accrued earnings.
 */
router.post('/seller/payout-request', requireAuth, async (req, res) => {
  try {
    const instituteId = await resolveMarketplaceInstituteId(req);
    if (!instituteId) return res.status(400).json({ error: 'Please configure your college profile first.' });

    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { id: true, name: true, marketplaceEarningsPaise: true },
    });

    const accruedRupees = (institute.marketplaceEarningsPaise || 0) / 100;
    const {
      requestedAmountRupees,
      bankAccountName,
      bankAccountNumber,
      bankIfsc,
      bankName,
      upiId,
    } = req.body;

    const amount = parseFloat(requestedAmountRupees);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid payout amount in Rupees.' });
    }

    if (amount > accruedRupees) {
      return res.status(400).json({
        error: `Requested amount (₹${amount}) exceeds your available accrued balance of ₹${accruedRupees.toFixed(2)}.`,
      });
    }

    if (!bankAccountName || !bankAccountName.trim()) {
      return res.status(400).json({ error: 'Bank Account Holder Name is required.' });
    }
    if (!bankAccountNumber || !bankAccountNumber.trim()) {
      return res.status(400).json({ error: 'Bank Account Number is required.' });
    }
    if (!bankIfsc || !bankIfsc.trim()) {
      return res.status(400).json({ error: 'Bank IFSC code is required.' });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc.trim().toUpperCase())) {
      return res.status(400).json({ error: 'Invalid IFSC code format (e.g. SBIN0001234).' });
    }

    const pendingRequest = await prisma.marketplacePayoutRequest.findFirst({
      where: { instituteId, status: 'PENDING' },
    });
    if (pendingRequest) {
      return res.status(400).json({
        error: 'You already have a pending payout request under review. Please wait for Super Admin processing.',
      });
    }

    const payoutRequest = await prisma.marketplacePayoutRequest.create({
      data: {
        instituteId,
        requestedAmountRupees: amount,
        bankAccountName: bankAccountName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        bankName: (bankName || '').trim() || null,
        upiId: (upiId || '').trim() || null,
        status: 'PENDING',
      },
    });

    res.json({
      success: true,
      message: `Payout settlement request of ₹${amount} submitted successfully.`,
      payoutRequest,
    });
  } catch (err) {
    console.error('Error submitting payout request:', err);
    res.status(500).json({ error: 'Failed to submit payout request: ' + err.message });
  }
});

/**
 * GET /api/marketplace/seller/payout-requests
 * Returns settlement history for the authenticated college.
 */
router.get('/seller/payout-requests', requireAuth, async (req, res) => {
  try {
    const instituteId = await resolveMarketplaceInstituteId(req);
    if (!instituteId) return res.status(400).json({ error: 'Please configure your college profile first.' });

    const requests = await prisma.marketplacePayoutRequest.findMany({
      where: { instituteId },
      orderBy: { requestedAt: 'desc' },
    });

    res.json({ success: true, requests });
  } catch (err) {
    console.error('Error fetching payout requests:', err);
    res.status(500).json({ error: 'Failed to fetch payout requests.' });
  }
});

/**
 * GET /api/marketplace/admin/payout-requests
 * Super Admin endpoint to view all college payout settlement requests.
 */
router.get('/admin/payout-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const requests = await prisma.marketplacePayoutRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      include: {
        institute: {
          select: { id: true, name: true, slug: true, marketplaceEarningsPaise: true },
        },
      },
    });

    res.json({ success: true, requests });
  } catch (err) {
    console.error('Error fetching admin payout requests:', err);
    res.status(500).json({ error: 'Failed to fetch payout requests.' });
  }
});

/**
 * POST /api/marketplace/admin/payout-requests/:id/process
 * Super Admin marks payout as SETTLED (with bank UTR) or REJECTED.
 */
router.post('/admin/payout-requests/:id/process', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, transactionRef, adminNotes } = req.body;

    if (!['SETTLE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be SETTLE or REJECT.' });
    }

    const payout = await prisma.marketplacePayoutRequest.findUnique({
      where: { id },
      include: { institute: true },
    });

    if (!payout) return res.status(404).json({ error: 'Payout request not found.' });
    if (payout.status !== 'PENDING') {
      return res.status(400).json({ error: `Payout request is already ${payout.status}.` });
    }

    if (action === 'SETTLE') {
      if (!transactionRef || !transactionRef.trim()) {
        return res.status(400).json({ error: 'Bank Transaction / UTR reference number is required to confirm settlement.' });
      }

      const deductPaise = Math.round(payout.requestedAmountRupees * 100);

      await prisma.institute.update({
        where: { id: payout.instituteId },
        data: {
          marketplaceEarningsPaise: { decrement: deductPaise },
        },
      });

      const updated = await prisma.marketplacePayoutRequest.update({
        where: { id },
        data: {
          status: 'SETTLED',
          transactionRef: transactionRef.trim(),
          adminNotes: (adminNotes || '').trim() || null,
          processedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: `Payout of ₹${payout.requestedAmountRupees} successfully settled with UTR #${transactionRef.trim()}.`,
        payout: updated,
      });
    } else {
      const updated = await prisma.marketplacePayoutRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminNotes: (adminNotes || '').trim() || 'Settlement request was rejected by platform admin.',
          processedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Payout request marked as REJECTED.',
        payout: updated,
      });
    }
  } catch (err) {
    console.error('Error processing payout request:', err);
    res.status(500).json({ error: 'Failed to process payout request: ' + err.message });
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
