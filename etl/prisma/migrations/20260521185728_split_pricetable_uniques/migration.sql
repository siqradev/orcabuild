/*
  Warnings:

  - A unique constraint covering the columns `[source,state,month,year,type]` on the table `PriceTable` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[source,state,version,type]` on the table `PriceTable` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PriceTable_source_state_month_year_version_type_key";

-- CreateIndex
CREATE UNIQUE INDEX "PriceTable_sinapi_unique" ON "PriceTable"("source", "state", "month", "year", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PriceTable_seinfra_unique" ON "PriceTable"("source", "state", "version", "type");
