-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('UNIVERSITY', 'POLYTECHNIC', 'COLLEGE_OF_EDUCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discountKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "studentVerificationId" TEXT;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "studentDiscountMaxKobo" INTEGER,
ADD COLUMN     "studentDiscountPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "studentValidityDays" INTEGER NOT NULL DEFAULT 365;

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentVerification" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institutionId" TEXT,
    "otherInstitution" TEXT,
    "matricNumber" TEXT NOT NULL,
    "idPath" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentVerification_reference_key" ON "StudentVerification"("reference");

-- CreateIndex
CREATE INDEX "StudentVerification_phone_idx" ON "StudentVerification"("phone");

-- CreateIndex
CREATE INDEX "StudentVerification_status_createdAt_idx" ON "StudentVerification"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_studentVerificationId_fkey" FOREIGN KEY ("studentVerificationId") REFERENCES "StudentVerification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentVerification" ADD CONSTRAINT "StudentVerification_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
