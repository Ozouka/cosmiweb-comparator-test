CREATE TABLE "ComparisonStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL DEFAULT '',
    "productImage" TEXT NOT NULL DEFAULT '',
    "compareCount" INTEGER NOT NULL DEFAULT 1,
    "lastComparedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "ComparisonStat_shop_compareCount_idx" ON "ComparisonStat"("shop", "compareCount");

CREATE UNIQUE INDEX "ComparisonStat_shop_productId_key" ON "ComparisonStat"("shop", "productId");
