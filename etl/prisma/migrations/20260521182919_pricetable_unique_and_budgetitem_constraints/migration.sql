/*
  Warnings:

  - A unique constraint covering the columns `[budgetId,itemId]` on the table `BudgetItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[source,state,month,year,version,type]` on the table `PriceTable` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "BudgetItem_budgetId_idx";

-- DropIndex
DROP INDEX "BudgetItem_itemId_idx";

-- DropIndex
DROP INDEX "PriceTable_source_state_month_year_type_key";

-- DropIndex
DROP INDEX "PriceTable_source_state_version_type_key";

-- AlterTable
ALTER TABLE "PriceTable" ALTER COLUMN "type" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "BudgetItem_budgetId_itemId_idx" ON "BudgetItem"("budgetId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetItem_budgetId_itemId_key" ON "BudgetItem"("budgetId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceTable_source_state_month_year_version_type_key" ON "PriceTable"("source", "state", "month", "year", "version", "type");
