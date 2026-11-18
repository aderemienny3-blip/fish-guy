-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('POPUP', 'STICKER', 'FEATURED_STRIP', 'BAG_INSERT');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdEventType" AS ENUM ('IMPRESSION', 'CLICK');

-- CreateTable
CREATE TABLE "AdPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "priceKobo" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "maxConcurrent" INTEGER,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "priceKobo" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "artistName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "trackId" TEXT,
    "linkUrl" TEXT,
    "headline" TEXT NOT NULL,
    "tagline" TEXT,
    "imagePath" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "providerRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "AdEventType" NOT NULL,
    "viewerHash" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdCampaign_reference_key" ON "AdCampaign"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "AdCampaign_paymentRef_key" ON "AdCampaign"("paymentRef");

-- CreateIndex
CREATE INDEX "AdCampaign_status_placement_startDate_endDate_idx" ON "AdCampaign"("status", "placement", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AdCampaign_phone_idx" ON "AdCampaign"("phone");

-- CreateIndex
CREATE INDEX "AdEvent_campaignId_type_idx" ON "AdEvent"("campaignId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AdEvent_campaignId_type_viewerHash_day_key" ON "AdEvent"("campaignId", "type", "viewerHash", "day");

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "AdPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
