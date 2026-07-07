// src/domain/dtos/QuotationDTO.ts

export interface CreateQuotationDTO {
  description: string
  unit: string
  createdByUserId: string
  createdByName: string
}

export interface AddQuoteDTO {
  quotationId: string
  supplierName: string
  unitPrice: number
  ipi?: number
  icms?: number
  freightType?: 'FOB' | 'CIF'
  notes?: string
}

export interface ApproveQuotationDTO {
  quotationId: string
  quoteId: string
  // tableId da PriceTable "PROPRIA" onde o Item resultante será criado
  priceTableId: string
}
