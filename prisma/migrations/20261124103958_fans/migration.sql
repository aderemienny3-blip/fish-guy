-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "isSuperfanOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ListenEvent" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "listenerHash" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxSeconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "isFull" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,

    CONSTRAINT "ListenEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanAnnouncement" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "FanAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanUnsubscribe" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FanUnsubscribe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListenEvent_trackId_startedAt_idx" ON "ListenEvent"("trackId", "startedAt");

-- CreateIndex
CREATE INDEX "ListenEvent_listenerHash_trackId_day_idx" ON "ListenEvent"("listenerHash", "trackId", "day");

-- CreateIndex
CREATE INDEX "FanAnnouncement_artistId_createdAt_idx" ON "FanAnnouncement"("artistId", "createdAt");

-- CreateIndex
CREATE INDEX "FanAnnouncement_status_idx" ON "FanAnnouncement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FanUnsubscribe_email_artistId_key" ON "FanUnsubscribe"("email", "artistId");

-- AddForeignKey
ALTER TABLE "ListenEvent" ADD CONSTRAINT "ListenEvent_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanAnnouncement" ADD CONSTRAINT "FanAnnouncement_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
