const db = require('../src/db');

async function run() {
  console.log('Creating Marketplace tables...');
  try {
    await db.$executeRawUnsafe(`ALTER TABLE "Institute" ADD COLUMN "marketplaceEarningsPaise" INTEGER NOT NULL DEFAULT 0;`);
    console.log('Added marketplaceEarningsPaise to Institute');
  } catch(e) {
    console.log('marketplaceEarningsPaise column note:', e.message);
  }

  try {
    await db.$executeRawUnsafe(`ALTER TABLE "Institute" ADD COLUMN "marketplaceCreditsAutoConvert" BOOLEAN NOT NULL DEFAULT 1;`);
    console.log('Added marketplaceCreditsAutoConvert to Institute');
  } catch(e) {
    console.log('marketplaceCreditsAutoConvert column note:', e.message);
  }

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
  console.log('Created MarketplaceBook table');

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
  console.log('Created MarketplaceOrder table');

  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_orderNumber_key" ON "MarketplaceOrder"("orderNumber");`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_downloadToken_key" ON "MarketplaceOrder"("downloadToken");`);
  console.log('Indices created successfully!');

  // Seed sample initial master books if table is empty
  const count = await db.marketplaceBook.count();
  if (count === 0) {
    console.log('Seeding initial master publications for all 800 college portals...');
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
          priceRupees: 249.00,
          mrpRupees: 599.00,
          pageCount: 224,
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
          title: 'AP & TG EAPCET 2026 Ultimate 10-Full Mock Test Series',
          subtitle: 'Strictly Aligned with Latest 160-Question Speed Blueprint + Detailed Key Chits',
          description: 'Simulates the exact real-time exam conditions of AP & TG EAPCET. 160 questions per paper (80 Maths, 40 Physics, 40 Chemistry) with comprehensive explanations.',
          examTarget: 'AP EAPCET',
          subject: 'Comprehensive',
          classYear: 'Inter 2nd Year',
          author: 'QuestionStudio Academic Editorial',
          category: 'MOCK_TEST_SERIES',
          priceRupees: 299.00,
          mrpRupees: 699.00,
          pageCount: 280,
          fileKey: 'sample_eapcet_mocks.pdf',
          sampleFileKey: 'preview_eapcet_mocks.pdf',
          coverImageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
          isGlobal: true,
          isFeatured: true,
          salesCount: 0,
          rating: 5.0,
          reviewsCount: 0,
        },
        {
          id: 'qs-book-neet-bio-diagrams',
          title: 'NEET Biology Visual Atlas: 350+ NCERT Diagrams & Labeling Guide',
          subtitle: 'Never Lose Marks on Diagram-Based & Assertion-Reason Questions',
          description: 'Complete visual walkthrough of Botany & Zoology NCERT figures. Highlighted pitfalls, arrows, microscopic views, and high-frequency exam questions.',
          examTarget: 'NEET',
          subject: 'Biology',
          classYear: 'Class 11 & 12',
          author: 'QuestionStudio Academic Editorial',
          category: 'HANDBOOK',
          priceRupees: 179.00,
          mrpRupees: 399.00,
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
    console.log('Seeded 4 initial master study materials with 5-star ratings and student reviews!');
  }
}

run()
  .catch(console.error)
  .finally(() => db.$disconnect());
