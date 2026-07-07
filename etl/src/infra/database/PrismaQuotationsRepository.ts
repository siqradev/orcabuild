// src/infra/database/PrismaQuotationsRepository.ts

import { PrismaClient } from '@prisma/client'
import {
  IQuotationsRepository,
  QuotationResult,
  QuoteResult,
  QuotationListFilters,
} from '../../domain/repositories/QuotationsRepository'
import {
  CreateQuotationDTO,
  AddQuoteDTO,
  ApproveQuotationDTO,
} from '../../domain/dtos/QuotationDTO'
import { normalizeText } from '../../shared/utils/normalizeText'

const EXPIRATION_MONTHS = 6

export class PrismaQuotationsRepository implements IQuotationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Criar pedido de cotação ────────────────────────────────────────────────

  async create(data: CreateQuotationDTO): Promise<QuotationResult> {
    const quotation = await this.prisma.quotation.create({
      data: {
        description: data.description,
        unit: data.unit,
        createdByUserId: data.createdByUserId,
        createdByName: data.createdByName,
        status: 'PENDING',
      },
      include: { quotes: true },
    })
    return quotation as unknown as QuotationResult
  }

  // ─── Buscar por ID ──────────────────────────────────────────────────────────

  async findById(id: string): Promise<QuotationResult | null> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: { quotes: { orderBy: { unitPrice: 'asc' } } },
    })
    return quotation as unknown as QuotationResult | null
  }

  // ─── Listar ─────────────────────────────────────────────────────────────────

  async list(filters: QuotationListFilters = {}): Promise<QuotationResult[]> {
    const quotations = await this.prisma.quotation.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
      },
      include: { quotes: { orderBy: { unitPrice: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    return quotations as unknown as QuotationResult[]
  }

  // ─── Adicionar cotação de fornecedor ───────────────────────────────────────

  async addQuote(data: AddQuoteDTO): Promise<QuoteResult> {
    const quote = await this.prisma.quote.create({
      data: {
        quotationId: data.quotationId,
        supplierName: data.supplierName,
        unitPrice: data.unitPrice,
        ipi: data.ipi ?? null,
        icms: data.icms ?? null,
        freightType: data.freightType ?? null,
        notes: data.notes ?? null,
      },
    })

    // Move o pedido para OPEN assim que a primeira cotação chega
    await this.prisma.quotation.updateMany({
      where: { id: data.quotationId, status: 'PENDING' },
      data: { status: 'OPEN' },
    })

    return quote as unknown as QuoteResult
  }

  // ─── Remover cotação de fornecedor ─────────────────────────────────────────

  async removeQuote(quoteId: string): Promise<void> {
    await this.prisma.quote.delete({ where: { id: quoteId } })
  }

  // ─── Aprovar cotação vencedora ──────────────────────────────────────────────

  async approve(data: ApproveQuotationDTO): Promise<QuotationResult> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: data.quotationId },
      include: { quotes: true },
    })
    if (!quotation) throw new Error('Pedido de cotação não encontrado')

    if (!quotation.resultItemId) {
      throw new Error('Este pedido de cotação não possui um item pendente vinculado')
    }

    const winningQuote = quotation.quotes.find((q) => q.id === data.quoteId)
    if (!winningQuote) {
      throw new Error('Cotação informada não pertence a este pedido')
    }

    // Calcula preço final com impostos (IPI + ICMS aplicados sobre o preço base)
    const ipiRate = winningQuote.ipi ? Number(winningQuote.ipi) / 100 : 0
    const icmsRate = winningQuote.icms ? Number(winningQuote.icms) / 100 : 0
    const finalPrice =
      Number(winningQuote.unitPrice) * (1 + ipiRate) * (1 + icmsRate)

    const approvedAt = new Date()
    const expiresAt = new Date(approvedAt)
    expiresAt.setMonth(expiresAt.getMonth() + EXPIRATION_MONTHS)

    const updated = await this.prisma.$transaction(async (tx) => {
      // Atualiza o Item pendente já existente (o mesmo já referenciado
      // em qualquer Composition), em vez de criar um item novo
      await tx.item.update({
        where: { id: quotation.resultItemId! },
        data: { basePrice: finalPrice },
      })

      return tx.quotation.update({
        where: { id: data.quotationId },
        data: {
          status: 'APPROVED',
          approvedQuoteId: data.quoteId,
          approvedAt,
          expiresAt,
        },
        include: { quotes: true },
      })
    })

    return updated as unknown as QuotationResult
  }

  // ─── Expirar cotações vencidas ──────────────────────────────────────────────

  async expireOutdated(): Promise<number> {
    const { count } = await this.prisma.quotation.updateMany({
      where: {
        status: 'APPROVED',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    })
    return count
  }

  // ─── Autocomplete por descrição ─────────────────────────────────────────────

  async searchByDescription(query: string): Promise<QuotationResult[]> {
    const normalized = normalizeText(query)
    const quotations = await this.prisma.quotation.findMany({
      where: {
        description: { contains: normalized, mode: 'insensitive' },
      },
      include: { quotes: { orderBy: { unitPrice: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    return quotations as unknown as QuotationResult[]
  }
}
