// src/infra/http/controllers/QuotationsController.ts

import { FastifyRequest, FastifyReply } from 'fastify'
import {
  CreateQuotationUseCase,
  ListQuotationsUseCase,
  GetQuotationUseCase,
  AddQuoteUseCase,
  RemoveQuoteUseCase,
  ApproveQuotationUseCase,
  SearchQuotationsUseCase,
} from '../../../application/use-cases/QuotationUseCases'

interface CreateBody {
  description: string
  unit: string
  createdByUserId: string
  createdByName: string
}

interface AddQuoteBody {
  supplierName: string
  unitPrice: number
  ipi?: number
  icms?: number
  freightType?: 'FOB' | 'CIF'
  notes?: string
}

interface ApproveBody {
  quoteId: string
  priceTableId: string
}

export class QuotationsController {
  constructor(
    private readonly createUseCase: CreateQuotationUseCase,
    private readonly listUseCase: ListQuotationsUseCase,
    private readonly getUseCase: GetQuotationUseCase,
    private readonly addQuoteUseCase: AddQuoteUseCase,
    private readonly removeQuoteUseCase: RemoveQuoteUseCase,
    private readonly approveUseCase: ApproveQuotationUseCase,
    private readonly searchUseCase: SearchQuotationsUseCase
  ) {}

  // POST /quotations
  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as CreateBody
    try {
      const quotation = await this.createUseCase.execute(body)
      return reply.status(201).send({ quotation })
    } catch (error: any) {
      return reply.status(400).send({ error: error.message })
    }
  }

  // GET /quotations?status=OPEN
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { status } = request.query as { status?: 'PENDING' | 'OPEN' | 'APPROVED' | 'EXPIRED' }
    const quotations = await this.listUseCase.execute({ status })
    return reply.status(200).send({ quotations, count: quotations.length })
  }

  // GET /quotations/search?q=tubo
  async search(request: FastifyRequest, reply: FastifyReply) {
    const { q } = request.query as { q?: string }
    const quotations = await this.searchUseCase.execute(q ?? '')
    return reply.status(200).send({ quotations, count: quotations.length })
  }

  // GET /quotations/:id
  async getOne(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    try {
      const quotation = await this.getUseCase.execute(id)
      return reply.status(200).send({ quotation })
    } catch (error: any) {
      return reply.status(404).send({ error: error.message })
    }
  }

  // POST /quotations/:id/quotes
  async addQuote(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const body = request.body as AddQuoteBody
    try {
      const quote = await this.addQuoteUseCase.execute({
        quotationId: id,
        ...body,
      })
      return reply.status(201).send({ quote })
    } catch (error: any) {
      return reply.status(400).send({ error: error.message })
    }
  }

  // DELETE /quotations/quotes/:quoteId
  async removeQuote(request: FastifyRequest, reply: FastifyReply) {
    const { quoteId } = request.params as { quoteId: string }
    try {
      await this.removeQuoteUseCase.execute(quoteId)
      return reply.status(200).send({ message: 'Cotação removida com sucesso' })
    } catch (error: any) {
      return reply.status(400).send({ error: error.message })
    }
  }

  // POST /quotations/:id/approve
  async approve(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const body = request.body as ApproveBody
    try {
      const quotation = await this.approveUseCase.execute({
        quotationId: id,
        quoteId: body.quoteId,
        priceTableId: body.priceTableId,
      })
      return reply.status(200).send({ quotation })
    } catch (error: any) {
      return reply.status(400).send({ error: error.message })
    }
  }
}
