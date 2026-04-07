-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('BANNER', 'MODAL');

-- CreateEnum
CREATE TYPE "AnnouncementStyle" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'PROMO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasUsedTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "completedActions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "PurchaseReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCategory" "ItemCategory" NOT NULL DEFAULT 'GROCERY',
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "frequencyDays" INTEGER NOT NULL,
    "lastRemindedAt" TIMESTAMP(3),
    "nextRemindAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "style" "AnnouncementStyle" NOT NULL,
    "targetTiers" TEXT[],
    "ctaText" TEXT,
    "ctaDeepLink" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseReminder_userId_nextRemindAt_idx" ON "PurchaseReminder"("userId", "nextRemindAt");

-- CreateIndex
CREATE INDEX "PurchaseReminder_userId_itemCategory_idx" ON "PurchaseReminder"("userId", "itemCategory");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReminder_userId_itemName_key" ON "PurchaseReminder"("userId", "itemName");

-- AddForeignKey
ALTER TABLE "PurchaseReminder" ADD CONSTRAINT "PurchaseReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
