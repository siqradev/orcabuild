// src/domain/repositories/QuotationsRepository.ts
// Contrato puro de domínio — sem dependência de Prisma ou qualquer infra

import {
  CreateQuotationDTO,
  AddQuoteDTO,
  ApproveQuotationDTO,
} from '../dtos/QuotationDTO'

export interface IQuotationsRepository {
  create(data: CreateQuotationDTO): Promise<QuotationResult>
  findById(id: string): Promise<QuotationResult | null>
  list(filters?: QuotationListFilters): Promise<QuotationResult[]>
  addQuote(data: AddQuoteDTO): Promise<QuoteResult>
  removeQuote(quoteId: string): Promise<void>
  approve(data: ApproveQuotationDTO): Promise<QuotationResult>
  expireOutdated(): Promise<number>
  // Autocomplete — busca cotações por descrição parecida
  searchByDescription(query: string): Promise<QuotationResult[]>
}

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export interface QuoteResult {
  id: string
  quotationId: string
  supplierName: string
  unitPrice: number
  ipi: number | null
  icms: number | null
  freightType: 'FOB' | 'CIF' | null
  notes: string | null
  createdAt: Date
}

export interface QuotationResult {
  id: string
  description: string
  unit: string
  status: 'PENDING' | 'OPEN' | 'APPROVED' | 'EXPIRED'
  createdByUserId: string
  createdByName: string
  approvedQuoteId: string | null
  approvedAt: Date | null
  expiresAt: Date | null
  resultItemId: string | null
  createdAt: Date
  updatedAt: Date
  quotes: QuoteResult[]
}

export interface QuotationListFilters {
  status?: 'PENDING' | 'OPEN' | 'APPROVED' | 'EXPIRED'
}
