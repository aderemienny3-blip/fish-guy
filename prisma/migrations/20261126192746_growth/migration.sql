-- AlterEnum
ALTER TYPE "MusicOrderStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "MusicOrder" ADD COLUMN     "refundNote" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RegularItem" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegularItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegularItem_customerId_productId_key" ON "RegularItem"("customerId", "productId");

-- AddForeignKey
ALTER TABLE "RegularItem" ADD CONSTRAINT "RegularItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegularItem" ADD CONSTRAINT "RegularItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
