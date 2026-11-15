-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'MANAGER', 'PACKER', 'RIDER');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "openMinute" INTEGER NOT NULL DEFAULT 510,
    "closeMinute" INTEGER NOT NULL DEFAULT 1260,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "superBuyerMinOrders" INTEGER NOT NULL DEFAULT 5,
    "superBuyerWindowDays" INTEGER NOT NULL DEFAULT 90,
    "superBuyerMinSpendKobo" INTEGER NOT NULL DEFAULT 0,
    "loyalMinOrders" INTEGER NOT NULL DEFAULT 3,
    "newCustomerDays" INTEGER NOT NULL DEFAULT 30,
    "atRiskDays" INTEGER NOT NULL DEFAULT 45,
    "lostDays" INTEGER NOT NULL DEFAULT 90,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
