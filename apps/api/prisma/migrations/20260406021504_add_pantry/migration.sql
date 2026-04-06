-- CreateEnum
CREATE TYPE "PantryAction" AS ENUM ('MANUAL_ADD', 'MANUAL_REMOVE', 'PURCHASE', 'RECIPE_COOKED', 'EXPIRED', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCategory" "ItemCategory" NOT NULL DEFAULT 'GROCERY',
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "lastRestockedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pantryItemId" TEXT NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "action" "PantryAction" NOT NULL,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PantryLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PantryItem_userId_idx" ON "PantryItem"("userId");

-- CreateIndex
CREATE INDEX "PantryItem_userId_itemCategory_idx" ON "PantryItem"("userId", "itemCategory");

-- CreateIndex
CREATE UNIQUE INDEX "PantryItem_userId_itemName_key" ON "PantryItem"("userId", "itemName");

-- CreateIndex
CREATE INDEX "PantryLedger_pantryItemId_createdAt_idx" ON "PantryLedger"("pantryItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryLedger" ADD CONSTRAINT "PantryLedger_pantryItemId_fkey" FOREIGN KEY ("pantryItemId") REFERENCES "PantryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
