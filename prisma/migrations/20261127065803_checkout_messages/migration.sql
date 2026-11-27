-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reminder1At" TIMESTAMP(3),
ADD COLUMN     "reminder2At" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "checkoutUrl" TEXT;

-- CreateTable
CREATE TABLE "MessagingConsent" (
    "phone" TEXT NOT NULL,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'checkout',
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "optedOutAt" TIMESTAMP(3),
    "lastReorderAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessagingConsent_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref" TEXT,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageLog_createdAt_idx" ON "MessageLog"("createdAt");

-- CreateIndex
CREATE INDEX "MessageLog_kind_createdAt_idx" ON "MessageLog"("kind", "createdAt");
