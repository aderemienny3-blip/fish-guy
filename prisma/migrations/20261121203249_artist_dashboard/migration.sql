-- AlterTable
ALTER TABLE "MusicOrder" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "shareWithArtist" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MusicPlay" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "ArtistCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistCode_email_createdAt_idx" ON "ArtistCode"("email", "createdAt");
