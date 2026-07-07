// src/application/use-cases/QuotationUseCases.ts

import { IQuotationsRepository } from '../../domain/repositories/QuotationsRepository'
import {
  CreateQuotationDTO,
  AddQuoteDTO,
  ApproveQuotationDTO,
} from '../../domain/dtos/QuotationDTO'

export class CreateQuotationUseCase {
  constructor(private readonly repo: IQuotationsRepository) {}
  async execute(data: CreateQuotationDTO) {
    if (!data.description || data.description.trim().length < 3) {
      throw new Error('Descrição deve ter no mínimo 3 caracteres')
    }
    if (!data.unit) {
      throw new Error('Unidade é obrigatória')
    }
    return this.repo.create(data)
  }
}

export class ListQuotationsUseCase {
  constructor(private readonly repo: IQuotationsRepository) {}
  async execute(filters?: { status?: 'PENDING' | 'OPEN' | 'APPROVED' | 'EXPIRED' }) {
    await this.repo.expireOutdated()
    return this.repo.list(filters)
  }
}

export class GetQuotationUseCase {
  constructor(private readonly repo: IQuotationsRepository) {}
  async execute(id: string) {
    const quotation = await this.repo.findById(id)
    if (!quotation) throw new Error('Pedido de cotação não encontrado')
    return quotation
  }
}

export class AddQuoteUseCase {
  constructor(private readonly repo: IQuotationsRepository) {}
  async execute(data: AddQuoteDTO) {
    if (!data.supplierName || data.supplierName.trim().length < 2) {
      throw new Error('Nome do fornecedor é obrigatório')
    }
    if (!data.unitPrice || data.unitPrice <= 0) {
      throw new Error('Preço unitário deve ser maior que zero')
    }
    const quotation = await this.repo.findById(data.quotationId)
    if (!quotation) throw new Error('Pedido de cotação não encontrado')
    if (quotation.status === 'APPROVED') {
      throw new Error('Este pedido já foi aprovado e não aceita novas cotações')
    }
    return this.repo.addQuote(data)
  }
}

export class RemoveQuoteUseCase {
  constructor(private readonly repo: IQuotationsRepository) {}
  async execute(quoteId: string) {
    return this.repo.removeQuote(quoteId)
  }
}

export class ApproveQuotationUseCase {
  constructor(private readonly repo: IQuotationsRepository) {}
  async execute(data: ApproveQuotationDTO) {
    const quotation = await this.repo.findById(data.quotationId)
    if (!quotation) throw new Error('Pedido de cotação não encontrado')
    if (quotation.status === 'APPROVED') {
      throw new Error('Este pedido já foi aprovado anteriormente')
    }
    if (quotation.quotes.length < 3) {
      throw new Error(
        `São necessárias ao menos 3 cotações para aprovar (atualmente: ${quotation.quotes.length})`
      )
    }
    return this.repo.approve(data)
  }
}

export class SearchQuotationsUseCase {
  constructor(private readonly repo: IQuotationsRepository) {}
  async execute(query: string) {
    if (!query || query.trim().length < 2) return []
    return this.repo.searchByDescription(query)
  }
}
