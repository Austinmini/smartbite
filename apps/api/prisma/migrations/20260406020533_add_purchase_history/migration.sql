-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('GROCERY', 'FUEL', 'HOME_IMPROVEMENT', 'HOUSEHOLD', 'PERSONAL_CARE', 'PET_SUPPLIES', 'OTHER');

-- CreateTable
CREATE TABLE "PurchaseHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCategory" "ItemCategory" NOT NULL DEFAULT 'GROCERY',
    "upc" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeId" TEXT,
    "planId" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseHistory_userId_itemName_idx" ON "PurchaseHistory"("userId", "itemName");

-- CreateIndex
CREATE INDEX "PurchaseHistory_userId_purchasedAt_idx" ON "PurchaseHistory"("userId", "purchasedAt");

-- AddForeignKey
ALTER TABLE "PurchaseHistory" ADD CONSTRAINT "PurchaseHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
