-- AlterTable
ALTER TABLE "ArtistApplication" ADD COLUMN     "rightsAcceptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "copyrightOwner" TEXT,
ADD COLUMN     "copyrightYear" INTEGER,
ADD COLUMN     "rightsConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "rightsConfirmedBy" TEXT;

-- CreateTable
CREATE TABLE "TakedownReport" (
    "id" TEXT NOT NULL,
    "trackId" TEXT,
    "trackRef" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "reporterEmail" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proofUrl" TEXT,
    "signature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TakedownReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TakedownReport_status_createdAt_idx" ON "TakedownReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "TakedownReport" ADD CONSTRAINT "TakedownReport_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
