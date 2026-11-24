-- AlterTable
ALTER TABLE "MusicDownloadLink" ADD COLUMN     "country" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "usedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MusicOrderItem" ADD COLUMN     "downloadsFrom" TIMESTAMP(3);
