// src/infra/http/routes/import.routes.ts

import { FastifyInstance }              from 'fastify'
import { prisma }                       from '../../database/prisma'
import { PrismaItemsRepository }        from '../../database/PrismaItemsRepository'
import { PrismaCompositionsRepository } from '../../database/PrismaCompositionsRepository'
import { PrismaImportJobRepository }    from '../../database/PrismaImportJobRepository'
import { ImportTableUseCase }           from '../../../application/use-cases/ImportTableUseCase'
import { ImportController }             from '../controllers/ImportController'

export async function importRoutes(app: FastifyInstance) {
  const itemsRepo        = new PrismaItemsRepository(prisma)
  const compositionsRepo = new PrismaCompositionsRepository(prisma)
  const jobRepo          = new PrismaImportJobRepository(prisma)

  const useCase    = new ImportTableUseCase(itemsRepo, compositionsRepo, jobRepo)
  const controller = new ImportController(useCase)

  /**
   * POST /import
   * Importa tabela SINAPI — scraper automatico via portal da CAIXA.
   *
   * Body: { state?, month, year, filePath? }
   * Cria ONERADA e DESONERADA simultaneamente.
   */
  app.post('/import', async (request, reply) => {
    return controller.handleSinapi(request, reply)
  })

  /**
   * POST /import/seinfra
   * Importa tabela SEINFRA — upload manual dos arquivos .xls.
   * Usar quando houver nova versao da tabela (sem periodicidade fixa).
   *
   * Body: {
   *   version:      "028" | "028.1"   (028 = onerada, 028.1 = desonerada)
   *   insumos:      "/path/to/Tabela-de-Insumos-028.xls"
   *   planos:       "/path/to/Planos-de-Servicos-028.xls"
   *   composicoes?: "/path/to/Composicoes-028.xls"  (opcional)
   * }
   */
  app.post('/import/seinfra', async (request, reply) => {
    return controller.handleSeinfra(request, reply)
  })

  /**
   * GET /import/jobs
   * Lista os ultimos 50 jobs de importacao.
   */
  app.get('/import/jobs', async (_request, reply) => {
    const jobs = await prisma.importJob.findMany({
      orderBy: { startedAt: 'desc' },
      take:    50,
    })
    return reply.status(200).send(jobs)
  })

  /**
   * GET /import/jobs/:id
   * Detalhe de um job especifico.
   */
  app.get('/import/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const job    = await prisma.importJob.findUnique({ where: { id } })

    if (!job) {
      return reply.status(404).send({ error: `Job ${id} nao encontrado.` })
    }

    return reply.status(200).send(job)
  })
}
