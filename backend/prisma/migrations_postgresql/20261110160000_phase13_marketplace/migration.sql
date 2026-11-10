-- AlterTable Institute
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "marketplaceEarningsPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "marketplaceCreditsAutoConvert" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable MarketplaceBook
CREATE TABLE IF NOT EXISTS "MarketplaceBook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "examTarget" TEXT,
    "subject" TEXT,
    "classYear" TEXT,
    "author" TEXT NOT NULL DEFAULT 'QuestionStudio Academic Editorial',
    "category" TEXT NOT NULL DEFAULT 'STUDY_MATERIAL',
    "priceRupees" DOUBLE PRECISION NOT NULL DEFAULT 199.00,
    "mrpRupees" DOUBLE PRECISION DEFAULT 499.00,
    "coverImageUrl" TEXT,
    "fileKey" TEXT NOT NULL,
    "sampleFileKey" TEXT,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "instituteId" TEXT,
    "affiliateCommissionPct" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.9,
    "reviewsCount" INTEGER NOT NULL DEFAULT 18,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable MarketplaceOrder
CREATE TABLE IF NOT EXISTS "MarketplaceOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "sellingInstituteId" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "amountRupees" DOUBLE PRECISION NOT NULL,
    "collegeShareRupees" DOUBLE PRECISION NOT NULL,
    "platformShareRupees" DOUBLE PRECISION NOT NULL,
    "payoutMode" TEXT NOT NULL DEFAULT 'WALLET_CREDITS',
    "creditsAwarded" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'COMPLETED',
    "paymentMethod" TEXT NOT NULL DEFAULT 'UPI_RAZORPAY',
    "razorpayPaymentId" TEXT,
    "razorpayOrderId" TEXT,
    "downloadToken" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER NOT NULL DEFAULT 10,
    "downloadExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_orderNumber_key" ON "MarketplaceOrder"("orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_downloadToken_key" ON "MarketplaceOrder"("downloadToken");

CREATE INDEX IF NOT EXISTS "MarketplaceBook_instituteId_idx" ON "MarketplaceBook"("instituteId");
CREATE INDEX IF NOT EXISTS "MarketplaceBook_examTarget_idx" ON "MarketplaceBook"("examTarget");
CREATE INDEX IF NOT EXISTS "MarketplaceBook_subject_idx" ON "MarketplaceBook"("subject");
CREATE INDEX IF NOT EXISTS "MarketplaceBook_isGlobal_idx" ON "MarketplaceBook"("isGlobal");
CREATE INDEX IF NOT EXISTS "MarketplaceBook_isActive_idx" ON "MarketplaceBook"("isActive");

CREATE INDEX IF NOT EXISTS "MarketplaceOrder_bookId_idx" ON "MarketplaceOrder"("bookId");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_sellingInstituteId_idx" ON "MarketplaceOrder"("sellingInstituteId");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_downloadToken_idx" ON "MarketplaceOrder"("downloadToken");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_paymentStatus_idx" ON "MarketplaceOrder"("paymentStatus");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_buyerPhone_idx" ON "MarketplaceOrder"("buyerPhone");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketplaceBook_instituteId_fkey') THEN
        ALTER TABLE "MarketplaceBook" ADD CONSTRAINT "MarketplaceBook_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketplaceOrder_bookId_fkey') THEN
        ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MarketplaceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketplaceOrder_sellingInstituteId_fkey') THEN
        ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_sellingInstituteId_fkey" FOREIGN KEY ("sellingInstituteId") REFERENCES "Institute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
