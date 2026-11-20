-- AlterTable
ALTER TABLE "DeliveryZone" ADD COLUMN     "isPickup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "giftName" TEXT,
ADD COLUMN     "promoDiscountKobo" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "cartonKg" INTEGER;

-- CreateTable
CREATE TABLE "FestivePromo" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT 'Festive Carton Deals',
    "startDate" TEXT NOT NULL DEFAULT '2026-12-15',
    "endDate" TEXT NOT NULL DEFAULT '2027-01-09',
    "giftMinCartons" INTEGER NOT NULL DEFAULT 2,
    "giftName" TEXT,
    "giftQty" INTEGER NOT NULL DEFAULT 0,
    "bigMinCartons" INTEGER NOT NULL DEFAULT 5,
    "rewardType" TEXT NOT NULL DEFAULT 'NONE',
    "rewardValue" INTEGER NOT NULL DEFAULT 0,
    "stackWithStudent" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivePromo_pkey" PRIMARY KEY ("id")
);
