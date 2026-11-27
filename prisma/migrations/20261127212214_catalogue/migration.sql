-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sizeGuide" TEXT;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "musicEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "BulkQuote" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "business" TEXT,
    "items" TEXT NOT NULL,
    "area" TEXT,
    "neededBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkQuote_status_createdAt_idx" ON "BulkQuote"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BulkQuote_phone_createdAt_idx" ON "BulkQuote"("phone", "createdAt");
