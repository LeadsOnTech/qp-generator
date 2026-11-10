-- AlterTable
ALTER TABLE "Institute" ADD COLUMN "marketplaceEarningsPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Institute" ADD COLUMN "marketplaceCreditsAutoConvert" BOOLEAN NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "MarketplaceBook" (
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

-- CreateTable
CREATE TABLE "MarketplaceOrder" (
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

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceOrder_orderNumber_key" ON "MarketplaceOrder"("orderNumber");
CREATE UNIQUE INDEX "MarketplaceOrder_downloadToken_key" ON "MarketplaceOrder"("downloadToken");

CREATE INDEX "MarketplaceBook_instituteId_idx" ON "MarketplaceBook"("instituteId");
CREATE INDEX "MarketplaceBook_examTarget_idx" ON "MarketplaceBook"("examTarget");
CREATE INDEX "MarketplaceBook_subject_idx" ON "MarketplaceBook"("subject");
CREATE INDEX "MarketplaceBook_isGlobal_idx" ON "MarketplaceBook"("isGlobal");
CREATE INDEX "MarketplaceBook_isActive_idx" ON "MarketplaceBook"("isActive");

CREATE INDEX "MarketplaceOrder_bookId_idx" ON "MarketplaceOrder"("bookId");
CREATE INDEX "MarketplaceOrder_sellingInstituteId_idx" ON "MarketplaceOrder"("sellingInstituteId");
CREATE INDEX "MarketplaceOrder_downloadToken_idx" ON "MarketplaceOrder"("downloadToken");
CREATE INDEX "MarketplaceOrder_paymentStatus_idx" ON "MarketplaceOrder"("paymentStatus");
CREATE INDEX "MarketplaceOrder_buyerPhone_idx" ON "MarketplaceOrder"("buyerPhone");
