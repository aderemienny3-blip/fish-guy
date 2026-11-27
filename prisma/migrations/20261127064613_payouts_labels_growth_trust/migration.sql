-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "accountName" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankName" TEXT;

-- CreateTable
CREATE TABLE "PayoutSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "artistBps" INTEGER NOT NULL,
    "minPayoutKobo" INTEGER NOT NULL DEFAULT 500000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackSplit" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "bps" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Collaborator',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "transferRef" TEXT,
    "note" TEXT,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Earning" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Earning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackSplit_artistId_idx" ON "TrackSplit"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackSplit_trackId_artistId_key" ON "TrackSplit"("trackId", "artistId");

-- CreateIndex
CREATE INDEX "Payout_artistId_idx" ON "Payout"("artistId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Earning_artistId_payoutId_idx" ON "Earning"("artistId", "payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Earning_orderItemId_artistId_key" ON "Earning"("orderItemId", "artistId");

-- AddForeignKey
ALTER TABLE "TrackSplit" ADD CONSTRAINT "TrackSplit_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackSplit" ADD CONSTRAINT "TrackSplit_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "MusicOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
