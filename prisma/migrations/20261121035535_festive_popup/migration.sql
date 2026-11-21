-- AlterTable
ALTER TABLE "FestivePromo" ADD COLUMN     "popupButton" TEXT,
ADD COLUMN     "popupDelay" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "popupEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "popupFrequency" TEXT NOT NULL DEFAULT 'VISIT',
ADD COLUMN     "popupHeadline" TEXT,
ADD COLUMN     "popupImage" TEXT,
ADD COLUMN     "popupLink" TEXT NOT NULL DEFAULT '/festive',
ADD COLUMN     "popupMessage" TEXT,
ADD COLUMN     "popupShowOffers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ribbonEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ribbonText" TEXT;
