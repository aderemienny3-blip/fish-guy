-- CreateEnum
CREATE TYPE "MusicOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "imageUrl" TEXT,
    "bannerUrl" TEXT,
    "email" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "mood" TEXT,
    "coverPath" TEXT,
    "previewPath" TEXT,
    "mp3Path" TEXT,
    "wavPath" TEXT,
    "priceKobo" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL,
    "isFreeToStream" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicPlay" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "listenerHash" TEXT NOT NULL,
    "playDay" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicPlay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicOrder" (
    "id" TEXT NOT NULL,
    "buyerSessionHash" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "providerRef" TEXT,
    "checkoutUrl" TEXT,
    "idempotencyKey" TEXT,
    "amountKobo" INTEGER NOT NULL,
    "status" "MusicOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "MusicOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "unitPriceKobo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicDownloadLink" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicDownloadLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistApplication" (
    "id" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "links" TEXT NOT NULL,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Track_slug_key" ON "Track"("slug");

-- CreateIndex
CREATE INDEX "Track_isPublished_releasedAt_idx" ON "Track"("isPublished", "releasedAt");

-- CreateIndex
CREATE INDEX "Track_artistId_idx" ON "Track"("artistId");

-- CreateIndex
CREATE INDEX "MusicPlay_playedAt_idx" ON "MusicPlay"("playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MusicPlay_trackId_listenerHash_playDay_key" ON "MusicPlay"("trackId", "listenerHash", "playDay");

-- CreateIndex
CREATE UNIQUE INDEX "MusicOrder_reference_key" ON "MusicOrder"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "MusicOrder_idempotencyKey_key" ON "MusicOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MusicOrder_buyerSessionHash_status_idx" ON "MusicOrder"("buyerSessionHash", "status");

-- CreateIndex
CREATE INDEX "MusicOrder_buyerEmail_idx" ON "MusicOrder"("buyerEmail");

-- CreateIndex
CREATE INDEX "MusicOrderItem_orderId_idx" ON "MusicOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "MusicOrderItem_trackId_idx" ON "MusicOrderItem"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicDownloadLink_tokenHash_key" ON "MusicDownloadLink"("tokenHash");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPlay" ADD CONSTRAINT "MusicPlay_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicOrderItem" ADD CONSTRAINT "MusicOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MusicOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicOrderItem" ADD CONSTRAINT "MusicOrderItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicDownloadLink" ADD CONSTRAINT "MusicDownloadLink_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "MusicOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
