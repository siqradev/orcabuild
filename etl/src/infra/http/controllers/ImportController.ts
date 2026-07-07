// src/infra/http/controllers/ImportController.ts

import path             from 'path'
import { FastifyRequest, FastifyReply } from 'fastify'
import {
  ImportTableUseCase,
  SinapiImportRequest,
  SeinfraImportRequest,
} from '../../../application/use-cases/ImportTableUseCase'

const VALID_STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
                      'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
                      'RO','RR','RS','SC','SE','SP','TO']

function safePath(input: string): string {
  const resolved = path.resolve(input)
  const allowed  = path.resolve(process.cwd(), 'temp')
  if (!resolved.startsWith(allowed)) {
    throw new Error(`Path não permitido: ${input}`)
  }
  return resolved
}

interface SinapiBody {
  state?:    string
  month:     number
  year:      number
  filePath?: string
}

interface SeinfraBody {
  version:      string
  insumos:      string
  planos:       string
  composicoes?: string
}

export class ImportController {
  constructor(private readonly useCase: ImportTableUseCase) {}

  async handleSinapi(request: FastifyRequest, reply: FastifyReply) {
    const body  = request.body as SinapiBody
    const state = (body.state ?? 'CE').toUpperCase()

    if (!VALID_STATES.includes(state)) {
      return reply.status(400).send({ error: `Estado inválido: ${body.state}` })
    }
    if (!body.month || body.month < 1 || body.month > 12) {
      return reply.status(400).send({ error: 'Campo "month" é obrigatório (1-12).' })
    }
    if (!body.year || body.year < 2020) {
      return reply.status(400).send({ error: 'Campo "year" é obrigatório (>= 2020).' })
    }

    const importRequest: SinapiImportRequest = {
      state,
      month:    body.month,
      year:     body.year,
      filePath: body.filePath,
    }

    try {
      const result = await this.useCase.executeSinapi(importRequest)
      return reply.status(201).send(result)
    } catch (error: any) {
      request.log.error({ err: error }, '[ImportController] falha SINAPI')
      return reply.status(500).send({ error: 'Falha na importacao SINAPI. Verifique os logs.' })
    }
  }

  async handleSeinfra(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as SeinfraBody

    const VERSION_REGEX = /^\d{3}(\.\d)?$/
    if (!body.version || !VERSION_REGEX.test(body.version)) {
      return reply.status(400).send({ error: 'Campo "version" é obrigatório: "028" ou "028.1".' })
    }
    if (!body.insumos) {
      return reply.status(400).send({ error: 'Campo "insumos" é obrigatório.' })
    }
    if (!body.planos) {
      return reply.status(400).send({ error: 'Campo "planos" é obrigatório.' })
    }

    // Valida paths — restringe ao diretório temp
    let insumos: string, planos: string, composicoes: string | undefined
    try {
      insumos    = safePath(body.insumos)
      planos     = safePath(body.planos)
      composicoes = body.composicoes ? safePath(body.composicoes) : undefined
    } catch (e: any) {
      return reply.status(400).send({ error: e.message })
    }

    const importRequest: SeinfraImportRequest = {
      version: body.version,
      insumos,
      planos,
      composicoes,
    }

    try {
      const result = await this.useCase.executeSeinfra(importRequest)
      return reply.status(201).send(result)
    } catch (error: any) {
      request.log.error({ err: error }, '[ImportController] falha SEINFRA')
      return reply.status(500).send({ error: 'Falha na importacao SEINFRA. Verifique os logs.' })
    }
  }
}