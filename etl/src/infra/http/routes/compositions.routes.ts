// src/infra/http/routes/compositions.routes.ts

import { FastifyInstance }                from 'fastify'
import { prisma }                         from '../../database/prisma'
import { PrismaItemsRepository }          from '../../database/PrismaItemsRepository'
import { PrismaCompositionsRepository }   from '../../database/PrismaCompositionsRepository'
import { ResolveCompositionUseCase }      from '../../../application/use-cases/ResolveCompositionUseCase'
import { CompositionsController }         from '../controllers/CompositionsController'

export async function compositionsRoutes(app: FastifyInstance) {
  const itemsRepo        = new PrismaItemsRepository(prisma)
  const compositionsRepo = new PrismaCompositionsRepository(prisma)

  const resolveUseCase = new ResolveCompositionUseCase(itemsRepo, compositionsRepo)
  const controller     = new CompositionsController(resolveUseCase, compositionsRepo)

  app.get('/compositions/:code/resolve', (req, reply) =>
    controller.resolve(req, reply)
  )

  app.get('/compositions/:code/children', (req, reply) =>
    controller.children(req, reply)
  )

  app.get('/compositions/:code/parents', (req, reply) =>
    controller.parents(req, reply)
  )

  /**
   * GET /price-tables
   * Lista todas as PriceTables ativas
   */
  app.get('/price-tables', async (_req, reply) => {
    const tables = await prisma.priceTable.findMany({
      where: { deletedAt: null },
      select: {
        id:          true,
        source:      true,
        state:       true,
        month:       true,
        year:        true,
        version:     true,
        type:        true,
        reference:   true,
        description: true,
      },
      orderBy: [{ source: 'asc' }, { year: 'desc' }, { month: 'desc' }],
    })
    return reply.send(tables)
  })
  /**
   * GET /compositions/list?tableId=<uuid>&q=<opcional>
   * Lista as Composições Próprias (type: COMPOSICAO) de uma tabela,
   * com busca textual opcional por descrição, ordenadas por código
   */
  app.get('/compositions/list', async (req, reply) => {
    const { tableId, q } = req.query as { tableId?: string; q?: string }

    if (!tableId) {
      return reply.status(400).send({ error: 'Parâmetro ?tableId= é obrigatório.' })
    }

    const items = await prisma.item.findMany({
      where: {
        priceTableId: tableId,
        type: 'COMPOSICAO',
        deletedAt: null,
        ...(q && q.trim().length >= 2
          ? { searchText: { contains: q.trim().toLowerCase(), mode: 'insensitive' } }
          : {}),
      },
      select: {
        id: true,
        code: true,
        description: true,
        unit: true,
        basePrice: true,
        encargosSociais: true,
        bdi: true,
        updatedAt: true,
        _count: { select: { compositions: true } },
      },
      orderBy: { code: 'asc' },
    })

    const results = items.map((i) => ({
      id: i.id,
      code: i.code,
      description: i.description,
      unit: i.unit,
      basePrice: i.basePrice ? Number(i.basePrice) : 0,
      encargosSociais: i.encargosSociais ? Number(i.encargosSociais) : 0,
      bdi: i.bdi ? Number(i.bdi) : 0,
      insumosCount: i._count.compositions,
      updatedAt: i.updatedAt,
    }))

    return reply.send({ results, count: results.length })
  })
  
  /**
   * POST /compositions/create-empty
   * Cria uma Composição Própria vazia (sem insumos ainda) — código CP00001, CP00002...
   * Body: { description, unit, createdByUserId, createdByName, priceTableId }
   */
  app.post('/compositions/create-empty', async (req, reply) => {
    const body = req.body as {
      description: string
      unit: string
      createdByUserId: string
      createdByName: string
      priceTableId: string
    }

    if (!body.description || body.description.trim().length < 3) {
      return reply.status(400).send({ error: 'Descrição deve ter no mínimo 3 caracteres' })
    }
    if (!body.unit) {
      return reply.status(400).send({ error: 'Unidade é obrigatória' })
    }

    const count = await prisma.item.count({
      where: { code: { startsWith: 'CP' } },
    })
    const code = `CP${String(count + 1).padStart(5, '0')}`

    const item = await prisma.item.create({
      data: {
        code,
        description: body.description,
        searchText: body.description.toLowerCase(),
        unit: body.unit,
        type: 'COMPOSICAO',
        basePrice: null,
        priceTableId: body.priceTableId,
        createdByUserId: body.createdByUserId,
        createdByName: body.createdByName,
        encargosSociais: 115, // valor padrão sugerido — editável
        bdi: 25,              // valor padrão sugerido — editável
      },
    })

    return reply.status(201).send({ item })
  })

  /**
   * POST /items/create-pending
   * Cria um item de cotação pendente, vinculado a uma Quotation já criada
   * Body: { quotationId, description, unit, priceTableId }
   */
  app.post('/items/create-pending', async (req, reply) => {
    const body = req.body as {
      quotationId: string
      description: string
      unit: string
      priceTableId: string
    }

    const quotation = await prisma.quotation.findUnique({ where: { id: body.quotationId } })
    if (!quotation) {
      return reply.status(404).send({ error: 'Pedido de cotação não encontrado' })
    }

    const count = await prisma.item.count({
      where: { code: { startsWith: 'COT' } },
    })
    const code = `COT${String(count + 1).padStart(5, '0')}`

    const item = await prisma.item.create({
      data: {
        code,
        description: body.description,
        searchText: body.description.toLowerCase(),
        unit: body.unit,
        type: 'INSUMO',
        basePrice: null,
        priceTableId: body.priceTableId,
        createdByUserId: quotation.createdByUserId,
        createdByName: quotation.createdByName,
      },
    })

    await prisma.quotation.update({
      where: { id: body.quotationId },
      data: { resultItemId: item.id },
    })

    return reply.status(201).send({ item })
  })

  /**
   * GET /compositions/:code/detail?tableId=<uuid>
   * Retorna a composição própria com seus insumos agrupados por categoria,
   * já com os totais calculados (custo direto, encargos, BDI, valor geral)
   */
  app.get('/compositions/:code/detail', async (req, reply) => {
    const { code } = req.params as { code: string }
    const { tableId } = req.query as { tableId?: string }

    if (!tableId) {
      return reply.status(400).send({ error: 'Parâmetro ?tableId= é obrigatório.' })
    }

    const parent = await prisma.item.findUnique({
      where: { code_priceTableId: { code, priceTableId: tableId } },
      include: {
        compositions: {
          include: { childItem: { include: { priceTable: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!parent) {
      return reply.status(404).send({ error: 'Composição não encontrada' })
    }

    const insumos = parent.compositions.map((c) => {
      const unitPrice = c.childItem.basePrice ? Number(c.childItem.basePrice) : 0
      const total = unitPrice * Number(c.coefficient)
      return {
        compositionId: c.id,
        category: c.category,
        itemId: c.childItem.id,
        code: c.childItem.code,
        description: c.childItem.description,
        unit: c.childItem.unit,
        coefficient: Number(c.coefficient),
        unitPrice,
        total,
        hasPrice: c.childItem.basePrice !== null,
      }
    })

    const sumByCategory = (cat: string) =>
      insumos.filter((i) => i.category === cat).reduce((a, i) => a + i.total, 0)

    const maoDeObraTotal = sumByCategory('MAO_DE_OBRA')
    const materialTotal = sumByCategory('MATERIAL')
    const equipamentoTotal = sumByCategory('EQUIPAMENTO')

    const encargosSociais = parent.encargosSociais ? Number(parent.encargosSociais) : 0
    const bdi = parent.bdi ? Number(parent.bdi) : 0

    const encargosValor = maoDeObraTotal * (encargosSociais / 100)
    const custoDireto = maoDeObraTotal + encargosValor + materialTotal + equipamentoTotal
    const bdiValor = custoDireto * (bdi / 100)
    const valorGeral = custoDireto + bdiValor

    return reply.send({
      item: {
        id: parent.id,
        code: parent.code,
        description: parent.description,
        unit: parent.unit,
        encargosSociais,
        bdi,
      },
      insumos,
      totals: {
        maoDeObraTotal,
        encargosValor,
        materialTotal,
        equipamentoTotal,
        custoDireto,
        bdiValor,
        valorGeral,
      },
    })
  })

  /**
   * POST /compositions/:code/insumos
   * Adiciona um insumo à composição (vindo do catálogo OU manual/cotação)
   * Body (catálogo): { tableId, source: 'CATALOG', catalogCode, catalogTableId, category, coefficient }
   * Body (manual):   { tableId, source: 'MANUAL', description, unit, unitPrice, category, coefficient, createdByUserId, createdByName }
   */
  app.post('/compositions/:code/insumos', async (req, reply) => {
    const { code } = req.params as { code: string }
    const body = req.body as {
      tableId: string
      source: 'CATALOG' | 'MANUAL'
      category: 'MAO_DE_OBRA' | 'MATERIAL' | 'EQUIPAMENTO'
      coefficient: number
      // CATALOG
      catalogCode?: string
      catalogTableId?: string
      // MANUAL
      description?: string
      unit?: string
      unitPrice?: number
      createdByUserId?: string
      createdByName?: string
    }

    const parent = await prisma.item.findUnique({
      where: { code_priceTableId: { code, priceTableId: body.tableId } },
    })
    if (!parent) {
      return reply.status(404).send({ error: 'Composição não encontrada' })
    }

    let childItemId: string

    if (body.source === 'CATALOG') {
      if (!body.catalogCode || !body.catalogTableId) {
        return reply.status(400).send({ error: 'catalogCode e catalogTableId são obrigatórios' })
      }
      const childItem = await prisma.item.findUnique({
        where: { code_priceTableId: { code: body.catalogCode, priceTableId: body.catalogTableId } },
      })
      if (!childItem) {
        return reply.status(404).send({ error: 'Item do catálogo não encontrado' })
      }
      childItemId = childItem.id
    } else {
      // MANUAL — cria um item próprio simples com preço fixo digitado
      if (!body.description || !body.unit || body.unitPrice === undefined) {
        return reply.status(400).send({ error: 'description, unit e unitPrice são obrigatórios para insumo manual' })
      }
      const count = await prisma.item.count({ where: { code: { startsWith: 'INP' } } })
      const manualCode = `INP${String(count + 1).padStart(5, '0')}`

      const manualItem = await prisma.item.create({
        data: {
          code: manualCode,
          description: body.description,
          searchText: body.description.toLowerCase(),
          unit: body.unit,
          type: 'INSUMO',
          basePrice: body.unitPrice,
          priceTableId: body.tableId,
          createdByUserId: body.createdByUserId,
          createdByName: body.createdByName,
        },
      })
      childItemId = manualItem.id
    }

    const composition = await prisma.composition.create({
      data: {
        parentItemId: parent.id,
        childItemId,
        coefficient: body.coefficient,
        category: body.category,
      },
    })

    return reply.status(201).send({ composition })
  })

  /**
   * DELETE /compositions/insumos/:compositionId
   */
  app.delete('/compositions/insumos/:compositionId', async (req, reply) => {
    const { compositionId } = req.params as { compositionId: string }
    await prisma.composition.delete({ where: { id: compositionId } })
    return reply.send({ message: 'Insumo removido com sucesso' })
  })

  /**
   * PATCH /compositions/:code/pricing
   * Atualiza encargosSociais e/ou bdi da composição, e recalcula o basePrice do Item
   * Body: { tableId, encargosSociais?, bdi? }
   */
  app.patch('/compositions/:code/pricing', async (req, reply) => {
    const { code } = req.params as { code: string }
    const body = req.body as { tableId: string; encargosSociais?: number; bdi?: number }

    const parent = await prisma.item.findUnique({
      where: { code_priceTableId: { code, priceTableId: body.tableId } },
      include: { compositions: { include: { childItem: true } } },
    })
    if (!parent) {
      return reply.status(404).send({ error: 'Composição não encontrada' })
    }

    const encargosSociais = body.encargosSociais ?? (parent.encargosSociais ? Number(parent.encargosSociais) : 0)
    const bdi = body.bdi ?? (parent.bdi ? Number(parent.bdi) : 0)

    const sumByCategory = (cat: string) =>
      parent.compositions
        .filter((c) => c.category === cat)
        .reduce((a, c) => a + (c.childItem.basePrice ? Number(c.childItem.basePrice) : 0) * Number(c.coefficient), 0)

    const maoDeObraTotal = sumByCategory('MAO_DE_OBRA')
    const materialTotal = sumByCategory('MATERIAL')
    const equipamentoTotal = sumByCategory('EQUIPAMENTO')

    const encargosValor = maoDeObraTotal * (encargosSociais / 100)
    const custoDireto = maoDeObraTotal + encargosValor + materialTotal + equipamentoTotal
    const bdiValor = custoDireto * (bdi / 100)
    const valorGeral = custoDireto + bdiValor

    const updated = await prisma.item.update({
      where: { id: parent.id },
      data: {
        encargosSociais,
        bdi,
        basePrice: valorGeral,
      },
    })

    return reply.send({ item: updated, totals: { maoDeObraTotal, encargosValor, materialTotal, equipamentoTotal, custoDireto, bdiValor, valorGeral } })
  })
}
