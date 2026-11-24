-- CreateEnum
CREATE TYPE "LabelStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "labelId" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "status" "LabelStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "emailVerifiedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidUntil" TIMESTAMP(3),
    "rejectNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelMember" (
    "id" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelPayment" (
    "id" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "LabelPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Label_ownerEmail_key" ON "Label"("ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "LabelMember_email_key" ON "LabelMember"("email");

-- CreateIndex
CREATE INDEX "LabelMember_labelId_idx" ON "LabelMember"("labelId");

-- CreateIndex
CREATE UNIQUE INDEX "LabelPayment_reference_key" ON "LabelPayment"("reference");

-- CreateIndex
CREATE INDEX "LabelPayment_labelId_idx" ON "LabelPayment"("labelId");

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelMember" ADD CONSTRAINT "LabelMember_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelPayment" ADD CONSTRAINT "LabelPayment_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;
