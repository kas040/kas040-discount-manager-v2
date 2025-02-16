/*
  # Add discount management tables
  
  1. New Tables
    - `DiscountRule`: Stores discount rules and their configurations
    - `Filter`: Stores filters for discount rules
    - `Product`: Stores product information and pricing
    - `History`: Tracks price change history
  
  2. Changes
    - Added relationships between tables
    - Added indexes for performance
    
  3. Security
    - No special security needed as this is internal to the app
*/

-- CreateTable
CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Filter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("ruleId") REFERENCES "DiscountRule"("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vendor" TEXT,
    "originalPrice" REAL NOT NULL,
    "currentPrice" REAL NOT NULL,
    "comparePrice" REAL,
    "ruleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("ruleId") REFERENCES "DiscountRule"("id") ON DELETE SET NULL
);

-- CreateTable
CREATE TABLE "History" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "oldPrice" REAL NOT NULL,
    "newPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
    FOREIGN KEY ("ruleId") REFERENCES "DiscountRule"("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_discount_rule_shop" ON "DiscountRule"("shop");
CREATE INDEX "idx_product_shop" ON "Product"("shop");
CREATE INDEX "idx_filter_rule" ON "Filter"("ruleId");
CREATE INDEX "idx_history_product" ON "History"("productId");
CREATE INDEX "idx_history_rule" ON "History"("ruleId");