-- AlterTable MarketplaceBook
ALTER TABLE "MarketplaceBook" ADD COLUMN "fulfillmentType" TEXT NOT NULL DEFAULT 'DIGITAL_PDF';
ALTER TABLE "MarketplaceBook" ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceBook" ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "MarketplaceBook" ADD COLUMN "weightGrams" INTEGER NOT NULL DEFAULT 300;
ALTER TABLE "MarketplaceBook" ADD COLUMN "sku" TEXT;
ALTER TABLE "MarketplaceBook" ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'APPROVED_GLOBAL';
ALTER TABLE "MarketplaceBook" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "MarketplaceBook" ADD COLUMN "reviewedAt" DATETIME;

-- CreateTable MarketplaceOrderItem
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

-- CreateTable MarketplaceLedgerEntry
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

-- CreateTable MarketplaceShippingAddress
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

-- CreateTable MarketplaceShipment
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

-- CreateTable MarketplaceCart
CREATE TABLE IF NOT EXISTS "MarketplaceCart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "referralCollegeSlug" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable MarketplaceCartItem
CREATE TABLE IF NOT EXISTS "MarketplaceCartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "MarketplaceCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "MarketplaceCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketplaceCartItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MarketplaceBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable MarketplaceReview
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

-- CreateTable MarketplaceWishlist
CREATE TABLE IF NOT EXISTS "MarketplaceWishlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceWishlist_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MarketplaceBook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable MarketplaceCoupon
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketplaceBook_moderationStatus_idx" ON "MarketplaceBook"("moderationStatus");
CREATE INDEX IF NOT EXISTS "MarketplaceBook_fulfillmentType_idx" ON "MarketplaceBook"("fulfillmentType");
