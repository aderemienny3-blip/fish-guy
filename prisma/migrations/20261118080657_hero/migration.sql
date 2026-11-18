-- AlterEnum
ALTER TYPE "AdPlacement" ADD VALUE 'HERO_BANNER';

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "heroAlt" TEXT,
ADD COLUMN     "heroCaption" TEXT,
ADD COLUMN     "heroImageUrl" TEXT;
