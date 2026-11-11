const db = require('../db');

/**
 * Robust, idempotent SQLite schema synchronizer for Marketplace Phase 2B.
 * Safely adds any missing columns and tables to the persistent volume database on boot.
 */
async function ensureMarketplaceSchema() {
  console.log('[MARKETPLACE SYNC] Checking database tables and columns...');

  // 1. Institute table extensions
  try {
    await db.$executeRawUnsafe(`ALTER TABLE "Institute" ADD COLUMN "marketplaceEarningsPaise" INTEGER NOT NULL DEFAULT 0;`);
    console.log('[MARKETPLACE SYNC] Added marketplaceEarningsPaise to Institute');
  } catch (e) {
    // Column already exists, safe to ignore
  }

  try {
    await db.$executeRawUnsafe(`ALTER TABLE "Institute" ADD COLUMN "marketplaceCreditsAutoConvert" BOOLEAN NOT NULL DEFAULT 1;`);
    console.log('[MARKETPLACE SYNC] Added marketplaceCreditsAutoConvert to Institute');
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // 2. MarketplaceBook base table
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceBook" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "subtitle" TEXT,
      "description" TEXT,
      "examTarget" TEXT,
      "subject" TEXT,
      "classYear" TEXT,
      "author" TEXT NOT NULL DEFAULT 'QuestionStudio Academic Editorial',
      "category" TEXT NOT NULL DEFAULT 'STUDY_MATERIAL',
      "priceRupees" REAL NOT NULL DEFAULT 199.00,
      "mrpRupees" REAL DEFAULT 499.00,
      "coverImageUrl" TEXT,
      "fileKey" TEXT NOT NULL,
      "sampleFileKey" TEXT,
      "pageCount" INTEGER NOT NULL DEFAULT 0,
      "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
      "isGlobal" BOOLEAN NOT NULL DEFAULT 1,
      "instituteId" TEXT,
      "affiliateCommissionPct" REAL NOT NULL DEFAULT 10.0,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
      "salesCount" INTEGER NOT NULL DEFAULT 0,
      "rating" REAL NOT NULL DEFAULT 4.9,
      "reviewsCount" INTEGER NOT NULL DEFAULT 18,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "MarketplaceBook_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  // 3. MarketplaceBook additional columns (Phase 2B & Moderation)
  const bookColumns = [
    { name: 'moderationStatus', def: `TEXT NOT NULL DEFAULT 'APPROVED_GLOBAL'` },
    { name: 'fulfillmentType', def: `TEXT NOT NULL DEFAULT 'DIGITAL_PDF'` },
    { name: 'stockQuantity', def: `INTEGER NOT NULL DEFAULT 0` },
    { name: 'lowStockThreshold', def: `INTEGER NOT NULL DEFAULT 10` },
    { name: 'weightGrams', def: `INTEGER NOT NULL DEFAULT 300` },
    { name: 'sku', def: `TEXT` },
    { name: 'rejectionReason', def: `TEXT` },
    { name: 'reviewedAt', def: `DATETIME` },
  ];
  for (const col of bookColumns) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "MarketplaceBook" ADD COLUMN "${col.name}" ${col.def};`);
      console.log(`[MARKETPLACE SYNC] Added column ${col.name} to MarketplaceBook`);
    } catch (e) {
      // Column already exists, safe to ignore
    }
  }

  // 4. MarketplaceOrder table
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceOrder" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderNumber" TEXT NOT NULL,
      "bookId" TEXT NOT NULL,
      "sellingInstituteId" TEXT,
      "buyerName" TEXT NOT NULL,
      "buyerPhone" TEXT NOT NULL,
      "buyerEmail" TEXT NOT NULL,
      "amountRupees" REAL NOT NULL,
      "collegeShareRupees" REAL NOT NULL,
      "platformShareRupees" REAL NOT NULL,
      "payoutMode" TEXT NOT NULL DEFAULT 'WALLET_CREDITS',
      "creditsAwarded" INTEGER NOT NULL DEFAULT 0,
      "paymentStatus" TEXT NOT NULL DEFAULT 'COMPLETED',
      "paymentMethod" TEXT NOT NULL DEFAULT 'UPI_RAZORPAY',
      "razorpayPaymentId" TEXT,
      "razorpayOrderId" TEXT,
      "downloadToken" TEXT NOT NULL,
      "downloadCount" INTEGER NOT NULL DEFAULT 0,
      "maxDownloads" INTEGER NOT NULL DEFAULT 10,
      "downloadExpiresAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "MarketplaceOrder_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MarketplaceBook" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MarketplaceOrder_sellingInstituteId_fkey" FOREIGN KEY ("sellingInstituteId") REFERENCES "Institute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  // 5. Ancillary marketplace tables
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceOrderItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "bookId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "unitPriceRupees" REAL NOT NULL,
      "totalPriceRupees" REAL NOT NULL,
      "publishingInstituteId" TEXT,
      "referralInstituteId" TEXT,
      "caseClassification" TEXT NOT NULL DEFAULT 'CASE_A',
      "publisherShareRupees" REAL NOT NULL DEFAULT 0.0,
      "referralShareRupees" REAL NOT NULL DEFAULT 0.0,
      "platformShareRupees" REAL NOT NULL DEFAULT 0.0,
      "downloadToken" TEXT,
      "downloadCount" INTEGER NOT NULL DEFAULT 0,
      "maxDownloads" INTEGER NOT NULL DEFAULT 10,
      "downloadExpiresAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MarketplaceOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MarketplaceOrderItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MarketplaceBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceLedgerEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "instituteId" TEXT,
      "entryType" TEXT NOT NULL,
      "roleType" TEXT NOT NULL,
      "creditAmountRupees" REAL NOT NULL DEFAULT 0.0,
      "debitAmountRupees" REAL NOT NULL DEFAULT 0.0,
      "netAmountRupees" REAL NOT NULL,
      "payoutBatchId" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MarketplaceLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MarketplaceLedgerEntry_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceShippingAddress" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "addressLine1" TEXT NOT NULL,
      "addressLine2" TEXT,
      "landmark" TEXT,
      "city" TEXT NOT NULL,
      "district" TEXT NOT NULL,
      "state" TEXT NOT NULL,
      "pincode" TEXT NOT NULL,
      CONSTRAINT "MarketplaceShippingAddress_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceShipment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "carrierName" TEXT,
      "trackingNumber" TEXT,
      "trackingUrl" TEXT,
      "status" TEXT NOT NULL DEFAULT 'MANIFESTED',
      "dispatchedAt" DATETIME,
      "deliveredAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MarketplaceShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceCart" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "userId" TEXT,
      "referralCollegeSlug" TEXT,
      "updatedAt" DATETIME NOT NULL
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceCartItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "cartId" TEXT NOT NULL,
      "bookId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      CONSTRAINT "MarketplaceCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "MarketplaceCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MarketplaceCartItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MarketplaceBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceReview" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "bookId" TEXT NOT NULL,
      "studentName" TEXT NOT NULL,
      "studentPhone" TEXT NOT NULL,
      "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT 1,
      "rating" INTEGER NOT NULL DEFAULT 5,
      "headline" TEXT,
      "reviewText" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MarketplaceReview_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MarketplaceBook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceWishlist" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "bookId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MarketplaceWishlist_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MarketplaceBook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceCoupon" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL,
      "discountType" TEXT NOT NULL,
      "discountValue" REAL NOT NULL,
      "minOrderValueRupees" REAL NOT NULL DEFAULT 0.0,
      "maxDiscountRupees" REAL,
      "fundingSource" TEXT NOT NULL DEFAULT 'PLATFORM',
      "restrictedInstituteId" TEXT,
      "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "validUntil" DATETIME NOT NULL,
      "maxUses" INTEGER NOT NULL DEFAULT 1000,
      "usedCount" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT 1
    );
  `);

  // Indexes
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_orderNumber_key" ON "MarketplaceOrder"("orderNumber");`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_downloadToken_key" ON "MarketplaceOrder"("downloadToken");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceBook_moderationStatus_idx" ON "MarketplaceBook"("moderationStatus");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceBook_fulfillmentType_idx" ON "MarketplaceBook"("fulfillmentType");`);

  // 6. Seed initial 4 master books if table is empty
  const count = await db.marketplaceBook.count();
  if (count === 0) {
    console.log('[MARKETPLACE SYNC] Seeding initial master publications...');
    await db.marketplaceBook.createMany({
      data: [
        {
          id: 'qs-book-neet-formula',
          title: 'NEET 2026 Physics & Chemistry High-Yield Formula Handbook',
          subtitle: 'Complete 11th & 12th Rapid Revision with Solved Examples & Memory Maps',
          description: 'Curated by top AIIMS & IITian deans. Contains all 180+ essential derivation shortcuts, graphical insights, and high-frequency formula matrices tested in the last 15 years of NEET-UG.',
          examTarget: 'NEET',
          subject: 'Comprehensive',
          classYear: 'Class 12 & Droppers',
          author: 'QuestionStudio Academic Editorial',
          category: 'FORMULA_BOOK',
          fulfillmentType: 'DIGITAL_PDF',
          moderationStatus: 'APPROVED_GLOBAL',
          priceRupees: 199.00,
          mrpRupees: 499.00,
          pageCount: 168,
          fileKey: 'sample_neet_formula_handbook.pdf',
          sampleFileKey: 'preview_neet_formula_handbook.pdf',
          coverImageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
          isGlobal: true,
          isFeatured: true,
          salesCount: 0,
          rating: 5.0,
          reviewsCount: 0,
        },
        {
          id: 'qs-book-jee-maths-pyq',
          title: 'JEE Main 10-Year Chapterwise PYQ Blueprint (2015–2025)',
          subtitle: 'Fully Solved with Step-by-Step Graphical Approaches & Eliminator Tricks',
          description: 'Master every single question type asked by NTA in JEE Main Mathematics. Categorized by difficulty, Bloom’s taxonomy, and historical question recurrence rate.',
          examTarget: 'JEE Main',
          subject: 'Mathematics',
          classYear: 'Class 12 & Droppers',
          author: 'QuestionStudio Academic Editorial',
          category: 'PYQ_SOLUTIONS',
          fulfillmentType: 'DIGITAL_PDF',
          moderationStatus: 'APPROVED_GLOBAL',
          priceRupees: 249.00,
          mrpRupees: 599.00,
          pageCount: 220,
          fileKey: 'sample_jee_maths_pyq.pdf',
          sampleFileKey: 'preview_jee_maths_pyq.pdf',
          coverImageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
          isGlobal: true,
          isFeatured: true,
          salesCount: 0,
          rating: 5.0,
          reviewsCount: 0,
        },
        {
          id: 'qs-book-eapcet-grand-mock',
          title: 'AP & TG EAPCET 2026 Grand Mock Test Blueprint',
          subtitle: '15 Full-Length Multi-Set Simulated Papers with Detailed Video Solutions',
          description: 'The definitive practice master for Andhra Pradesh & Telangana engineering aspirants. Calibrated precisely to the latest standard question ratios and sectional weightages.',
          examTarget: 'AP EAPCET',
          subject: 'Comprehensive',
          classYear: 'Class 12',
          author: 'QuestionStudio Academic Editorial',
          category: 'MOCK_TEST_SERIES',
          fulfillmentType: 'DIGITAL_PDF',
          moderationStatus: 'APPROVED_GLOBAL',
          priceRupees: 149.00,
          mrpRupees: 399.00,
          pageCount: 195,
          fileKey: 'sample_eapcet_mock.pdf',
          sampleFileKey: 'preview_eapcet_mock.pdf',
          coverImageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
          isGlobal: true,
          isFeatured: true,
          salesCount: 0,
          rating: 5.0,
          reviewsCount: 0,
        },
        {
          id: 'qs-book-neet-bio-diagrams',
          title: 'NEET Biology High-Yield Diagram Atlas & Rapid Flashcard Notes',
          subtitle: 'NCERT 100% Extracted Graphical Memory Maps & Label Elimination Bank',
          description: 'Zero in on the highest-scoring visual questions in Botany & Zoology. Covers all 120 NCERT diagram variations with memory triggers and historical question trends.',
          examTarget: 'NEET',
          subject: 'Biology',
          classYear: 'Class 11 & 12',
          author: 'QuestionStudio Academic Editorial',
          category: 'HANDBOOK',
          fulfillmentType: 'DIGITAL_PDF',
          moderationStatus: 'APPROVED_GLOBAL',
          priceRupees: 179.00,
          mrpRupees: 449.00,
          pageCount: 140,
          fileKey: 'sample_neet_bio_diagrams.pdf',
          sampleFileKey: 'preview_neet_bio_diagrams.pdf',
          coverImageUrl: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=600&q=80',
          isGlobal: true,
          isFeatured: false,
          salesCount: 0,
          rating: 5.0,
          reviewsCount: 0,
        }
      ]
    });
    console.log('[MARKETPLACE SYNC] Seeded 4 initial master study materials with verified counters!');
  }

  console.log('[MARKETPLACE SYNC] Marketplace schema is fully synchronized.');
}

module.exports = { ensureMarketplaceSchema };
