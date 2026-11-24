-- AlterTable
ALTER TABLE "MusicOrderItem" ADD COLUMN     "editionNo" INTEGER;

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "editionLimit" INTEGER,
ADD COLUMN     "payWhatYouWant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "releaseAt" TIMESTAMP(3),
ADD COLUMN     "suggestedKobo" INTEGER;
