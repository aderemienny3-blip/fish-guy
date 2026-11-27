-- AlterTable
ALTER TABLE "MusicOrder" ADD COLUMN     "refCode" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "fbc" TEXT,
ADD COLUMN     "fbp" TEXT,
ADD COLUMN     "refCode" TEXT,
ADD COLUMN     "trackIp" TEXT,
ADD COLUMN     "trackUa" TEXT,
ADD COLUMN     "trackingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "campaign" TEXT,
    "ref" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "artistId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkClick" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FunnelEvent_day_source_idx" ON "FunnelEvent"("day", "source");

-- CreateIndex
CREATE INDEX "FunnelEvent_ref_idx" ON "FunnelEvent"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelEvent_sid_type_day_key" ON "FunnelEvent"("sid", "type", "day");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedLink_code_key" ON "TrackedLink"("code");

-- CreateIndex
CREATE INDEX "LinkClick_code_createdAt_idx" ON "LinkClick"("code", "createdAt");
