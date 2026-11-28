-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "creditUsedKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralDiscountKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralRewardKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referrerId" TEXT;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "referralDiscountKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referralMinOrderKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralRewardKobo" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_customerId_key" ON "ReferralCode"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "CreditEntry_customerId_createdAt_idx" ON "CreditEntry"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditEntry_orderId_kind_key" ON "CreditEntry"("orderId", "kind");

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
