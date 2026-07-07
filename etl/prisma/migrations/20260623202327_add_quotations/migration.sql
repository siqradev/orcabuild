-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('PENDING', 'OPEN', 'APPROVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FreightType" AS ENUM ('FOB', 'CIF');

-- AlterEnum
ALTER TYPE "Source" ADD VALUE 'PROPRIA';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "createdByName" TEXT,
ADD COLUMN     "createdByUserId" TEXT;

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "approvedQuoteId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "resultItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "ipi" DECIMAL(5,2),
    "icms" DECIMAL(5,2),
    "freightType" "FreightType",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_approvedQuoteId_key" ON "Quotation"("approvedQuoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_resultItemId_key" ON "Quotation"("resultItemId");

-- CreateIndex
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");

-- CreateIndex
CREATE INDEX "Quotation_expiresAt_idx" ON "Quotation"("expiresAt");

-- CreateIndex
CREATE INDEX "Quote_quotationId_idx" ON "Quote"("quotationId");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_approvedQuoteId_fkey" FOREIGN KEY ("approvedQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_resultItemId_fkey" FOREIGN KEY ("resultItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
