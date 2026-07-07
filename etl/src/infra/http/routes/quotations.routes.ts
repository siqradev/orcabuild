// src/infra/http/routes/quotations.routes.ts

import { FastifyInstance } from 'fastify'
import { prisma } from '../../database/prisma'
import { PrismaQuotationsRepository } from '../../database/PrismaQuotationsRepository'
import {
  CreateQuotationUseCase,
  ListQuotationsUseCase,
  GetQuotationUseCase,
  AddQuoteUseCase,
  RemoveQuoteUseCase,
  ApproveQuotationUseCase,
  SearchQuotationsUseCase,
} from '../../../application/use-cases/QuotationUseCases'
import { QuotationsController } from '../controllers/QuotationsController'

export async function quotationsRoutes(app: FastifyInstance) {
  const repository = new PrismaQuotationsRepository(prisma)

  const controller = new QuotationsController(
    new CreateQuotationUseCase(repository),
    new ListQuotationsUseCase(repository),
    new GetQuotationUseCase(repository),
    new AddQuoteUseCase(repository),
    new RemoveQuoteUseCase(repository),
    new ApproveQuotationUseCase(repository),
    new SearchQuotationsUseCase(repository)
  )

  // GET /quotations/search?q=tubo  — autocomplete (precisa vir antes de /:id)
  app.get('/quotations/search', (req, reply) => controller.search(req, reply))

  // GET /quotations?status=OPEN
  app.get('/quotations', (req, reply) => controller.list(req, reply))

  // POST /quotations
  app.post('/quotations', (req, reply) => controller.create(req, reply))

  // GET /quotations/:id
  app.get('/quotations/:id', (req, reply) => controller.getOne(req, reply))

  // POST /quotations/:id/quotes
  app.post('/quotations/:id/quotes', (req, reply) => controller.addQuote(req, reply))

  // DELETE /quotations/quotes/:quoteId
  app.delete('/quotations/quotes/:quoteId', (req, reply) => controller.removeQuote(req, reply))

  // POST /quotations/:id/approve
  app.post('/quotations/:id/approve', (req, reply) => controller.approve(req, reply))
  
}