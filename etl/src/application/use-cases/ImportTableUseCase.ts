// src/application/use-cases/ImportTableUseCase.ts

import { spawn }        from 'child_process'
import path             from 'path'
import fs               from 'fs'
import { randomUUID }   from 'node:crypto'
import AdmZip           from 'adm-zip'

import { IItemsRepository }          from '../../domain/repositories/ItemsRepository'
import { ICompositionsRepository }   from '../../domain/repositories/CompositionsRepository'
import { PrismaImportJobRepository } from '../../infra/database/PrismaImportJobRepository'
import { prisma }                    from '../../infra/database/prisma'
import { CreateItemDTO }             from '../../domain/dtos/CreateItemDTO'
import {
  ParsedCompositionsPayload,
  isCompositionsPayload,
} from '../../domain/dtos/CompositionDTO'

export interface SinapiImportRequest {
  filePath?: string
  state:     string
  month:     number
  year:      number
}

export interface SeinfraImportRequest {
  version:      '028' | '028.1'
  insumos:      string
  planos:       string
  composicoes?: string
}

export interface SeinfraFileSet {
  insumos?:     string
  composicoes?: string
  planos?:      string
}

export interface ImportResult {
  jobId:             string
  tableIds:          { onerada: string | null; desonerada: string | null }
  itemsCount:        number
  compositionsCount: number
  message:           string
  logs:              ImportLogs
}

export interface ImportLogs {
  source:          string
  state?:          string
  reference:       string
  itemsOnerada:    number
  itemsDesonerada: number
  compositions:    number
  durationMs:      number
}

interface DualPayload {
  onerada:    CreateItemDTO[]
  desonerada: CreateItemDTO[]
}

function isDualPayload(data: unknown): data is DualPayload {
  return (
    typeof data === 'object' && data !== null &&
    'onerada'    in data && 'desonerada' in data &&
    Array.isArray((data as DualPayload).onerada) &&
    Array.isArray((data as DualPayload).desonerada)
  )
}

export class ImportTableUseCase {

  private static readonly VALID_STATES = new Set([
    'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
    'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
    'RO','RR','RS','SC','SE','SP','TO',
  ])

  constructor(
    private readonly itemsRepository:        IItemsRepository,
    private readonly compositionsRepository: ICompositionsRepository,
    private readonly jobRepository:          PrismaImportJobRepository,
  ) {}

  // ── SINAPI ─────────────────────────────────────────────────────────────────

  async executeSinapi(data: SinapiImportRequest): Promise<ImportResult> {
    const state = data.state.toUpperCase()

    if (!ImportTableUseCase.VALID_STATES.has(state)) {
      throw new Error(`Estado inválido: ${data.state}`)
    }

    const startedAt = Date.now()
    const reference = `${String(data.month).padStart(2, '0')}/${data.year}`

    const job = await this.jobRepository.create({
      source: 'SINAPI', state, month: data.month, year: data.year, type: 'ONERADA',
    })

    console.log(`[IMPORT] Job ${job.id} criado — SINAPI ${reference} ${state}`)

    try {
      await this.jobRepository.markAsRunning(job.id)

      const [tableOnerada, tableDesonerada] = await Promise.all([
        prisma.priceTable.upsert({
          where: { source_state_month_year_type: {
            source: 'SINAPI', state, month: data.month, year: data.year, type: 'ONERADA',
          }},
          update: { reference, description: `Tabela SINAPI ${reference} — ${state} (ONERADA)` },
          create: { source: 'SINAPI', state, month: data.month, year: data.year, type: 'ONERADA', reference, description: `Tabela SINAPI ${reference} — ${state} (ONERADA)` },
        }),
        prisma.priceTable.upsert({
          where: { source_state_month_year_type: {
            source: 'SINAPI', state, month: data.month, year: data.year, type: 'DESONERADA',
          }},
          update: { reference, description: `Tabela SINAPI ${reference} — ${state} (DESONERADA)` },
          create: { source: 'SINAPI', state, month: data.month, year: data.year, type: 'DESONERADA', reference, description: `Tabela SINAPI ${reference} — ${state} (DESONERADA)` },
        }),
      ])

      console.log(`[IMPORT] PriceTable ONERADA:    ${tableOnerada.id}`)
      console.log(`[IMPORT] PriceTable DESONERADA: ${tableDesonerada.id}`)

      let filePath = data.filePath ?? ''
      if (!filePath)                filePath = await this.runScraper(data)
      if (filePath.endsWith('.zip')) filePath = await this.extractXlsxFromZip(filePath, data.month, data.year)

      const parsed = await this.runParser(filePath, 'SINAPI', 'SINAPI', tableOnerada.id, tableDesonerada.id)
      if (!isDualPayload(parsed)) {
        throw new Error('Parser SINAPI nao retornou payload dual { onerada, desonerada }.')
      }

      await Promise.all([
        this.itemsRepository.bulkInsert(parsed.onerada),
        this.itemsRepository.bulkInsert(parsed.desonerada),
      ])

      let totalCompositions = 0
      const parsedAnalitico = await this.runParser(filePath, 'SINAPI', 'ANALITICO', tableOnerada.id)
      if (isCompositionsPayload(parsedAnalitico) && parsedAnalitico.compositions.length > 0) {
        await this.compositionsRepository.bulkInsert(parsedAnalitico.compositions, tableOnerada.id)
        await this.compositionsRepository.bulkInsert(parsedAnalitico.compositions, tableDesonerada.id)
        totalCompositions = parsedAnalitico.compositions.length * 2
        console.log(`[IMPORT] SINAPI Analitico ONERADA: ${parsedAnalitico.compositions.length} relacoes inseridas`)
        console.log(`[IMPORT] SINAPI Analitico DESONERADA: ${parsedAnalitico.compositions.length} relacoes inseridas`)
      }

      const durationMs = Date.now() - startedAt
      const logs: ImportLogs = {
        source: 'SINAPI', state, reference,
        itemsOnerada:    parsed.onerada.length,
        itemsDesonerada: parsed.desonerada.length,
        compositions:    totalCompositions,
        durationMs,
      }

      await this.jobRepository.markAsSuccess(
        job.id,
        parsed.onerada.length + parsed.desonerada.length,
        JSON.stringify(logs),
      )
      console.log(`[IMPORT] Job ${job.id} SUCCESS — onerada:${parsed.onerada.length} desonerada:${parsed.desonerada.length} composicoes:${totalCompositions} em ${durationMs}ms`)

      return {
        jobId:             job.id,
        tableIds:          { onerada: tableOnerada.id, desonerada: tableDesonerada.id },
        itemsCount:        parsed.onerada.length + parsed.desonerada.length,
        compositionsCount: totalCompositions,
        message:           'Importacao concluida com sucesso',
        logs,
      }

    } catch (error: any) {
      await this.jobRepository.markAsFailed(job.id, error.message ?? String(error))
      console.error(`[IMPORT] Job ${job.id} FAILED:`, error.message)
      throw error
    }
  }

  // ── SEINFRA ────────────────────────────────────────────────────────────────

  async executeSeinfra(data: SeinfraImportRequest): Promise<ImportResult> {
    const startedAt = Date.now()
    const isOnerada = data.version === '028'
    const reference = data.version
    const tipo      = isOnerada ? 'ONERADA' : 'DESONERADA'

    const job = await this.jobRepository.create({
      source:  'SEINFRA',
      state:   'CE',
      version: data.version,
      type:    tipo,
    })

    console.log(`[IMPORT] Job ${job.id} criado — SEINFRA ${reference}`)

    try {
      await this.jobRepository.markAsRunning(job.id)

      const desc = `Tabela SEINFRA ${reference} — CE (${tipo})`

      const table = await prisma.priceTable.upsert({
        where: { source_state_version_type: {
          source: 'SEINFRA', state: 'CE', version: data.version, type: tipo,
        }},
        update: { reference, description: desc },
        create: { source: 'SEINFRA', state: 'CE', version: data.version, type: tipo, reference, description: desc },
      })

      console.log(`[IMPORT] PriceTable SEINFRA ${tipo}: ${table.id}`)

      let totalItems        = 0
      let totalCompositions = 0

      const parsedInsumos = await this.runParser(data.insumos, 'SEINFRA', 'INSUMOS', table.id)
      if (Array.isArray(parsedInsumos)) {
        await this.itemsRepository.bulkInsert(parsedInsumos as CreateItemDTO[])
        totalItems += parsedInsumos.length
        console.log(`[IMPORT] SEINFRA insumos: ${parsedInsumos.length}`)
      }

      const parsedPlanos = await this.runParser(data.planos, 'SEINFRA', 'PLANOS', table.id)
      if (Array.isArray(parsedPlanos)) {
        await this.itemsRepository.bulkInsert(parsedPlanos as CreateItemDTO[])
        totalItems += parsedPlanos.length
        console.log(`[IMPORT] SEINFRA planos: ${parsedPlanos.length}`)
      }

      if (data.composicoes) {
        const res = await this.importSeinfraCompositions(data.composicoes, table.id)
        totalItems        += res.items
        totalCompositions += res.compositions
        console.log(`[IMPORT] SEINFRA composicoes: ${res.items} itens, ${res.compositions} relacoes`)
      }

      const durationMs = Date.now() - startedAt
      const logs: ImportLogs = {
        source:          'SEINFRA',
        reference,
        itemsOnerada:    isOnerada ? totalItems : 0,
        itemsDesonerada: isOnerada ? 0 : totalItems,
        compositions:    totalCompositions,
        durationMs,
      }

      await this.jobRepository.markAsSuccess(job.id, totalItems, JSON.stringify(logs))
      console.log(`[IMPORT] Job ${job.id} SUCCESS — ${totalItems} itens, ${totalCompositions} relacoes em ${durationMs}ms`)

      return {
        jobId:             job.id,
        tableIds:          isOnerada
          ? { onerada: table.id, desonerada: null }
          : { onerada: null,     desonerada: table.id },
        itemsCount:        totalItems,
        compositionsCount: totalCompositions,
        message:           'Importacao SEINFRA concluida com sucesso',
        logs,
      }

    } catch (error: any) {
      await this.jobRepository.markAsFailed(job.id, error.message ?? String(error))
      console.error(`[IMPORT] Job ${job.id} FAILED:`, error.message)
      throw error
    }
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  private async importSeinfraCompositions(
    filePath: string,
    refId:    string,
  ): Promise<{ items: number; compositions: number }> {
    const parsed = await this.runParser(filePath, 'SEINFRA', 'COMPOSICOES', refId)
    if (!isCompositionsPayload(parsed)) {
      console.warn('[IMPORT] Parser COMPOSICOES nao retornou payload esperado')
      return { items: 0, compositions: 0 }
    }

    const payload = parsed as ParsedCompositionsPayload
    if (payload.items.length > 0)        await this.itemsRepository.bulkInsert(payload.items)
    if (payload.compositions.length > 0) await this.compositionsRepository.bulkInsert(payload.compositions, refId)

    return { items: payload.items.length, compositions: payload.compositions.length }
  }

  private async runScraper(data: SinapiImportRequest): Promise<string> {
    const root   = process.cwd()
    const python = this.resolvePython(root)
    const script = path.resolve(root, 'scraper_sinapi.py')

    const stdout = await this.spawnPython(python, [
      script,
      data.state,
      String(data.month).padStart(2, '0'),
      String(data.year),
    ])

    const result = JSON.parse(stdout)
    if (!result.success) throw new Error(`Scraper SINAPI falhou: ${result.error}`)
    return result.excel_path
  }

  private async extractXlsxFromZip(zipPath: string, month: number, year: number): Promise<string> {
    const zip         = new AdmZip(zipPath)
    const extractPath = path.resolve(process.cwd(), 'temp', `sinapi_${year}_${month}`)
    zip.extractAllTo(extractPath, true)

    const xlsxFile = fs.readdirSync(extractPath).find(
      (f) =>
        f.toUpperCase().includes('REFERENCIA') &&
        f.toUpperCase().includes('SINAPI') &&
        f.endsWith('.xlsx') &&
        !f.startsWith('~$'),
    )

    if (!xlsxFile) throw new Error('SINAPI_Referencia*.xlsx nao encontrado no ZIP.')
    return path.resolve(extractPath, xlsxFile)
  }

  private async runParser(
    filePath:       string,
    source:         string,
    dataType:       string,
    refOnerada:     string,
    refDesonerada?: string,
  ): Promise<unknown> {
    const root    = process.cwd()
    const python  = this.resolvePython(root)
    const script  = path.resolve(root, 'UniversalParser.py')
    const tempDir = path.resolve(root, 'temp')
    const outFile = path.resolve(tempDir, `parser_out_${randomUUID()}.json`)

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const args = [script, filePath, source, dataType, refOnerada]
    if (refDesonerada) args.push(refDesonerada)
    args.push(outFile)

    await this.spawnPython(python, args)

    try {
      return JSON.parse(fs.readFileSync(outFile, 'utf-8'))
    } catch (err) {
      throw new Error(`Falha ao ler JSON do parser em ${outFile}: ${err}`)
    } finally {
      try { fs.unlinkSync(outFile) } catch {}
    }
  }

  private resolvePython(root: string): string {
    const candidates = [
      path.join(root, '.venv', 'bin', 'python3'),
      path.join(root, '.venv', 'bin', 'python'),
      path.join(root, 'venv',  'bin', 'python3'),
      path.join(root, 'venv',  'bin', 'python'),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
    return 'python3'
  }

  private spawnPython(pythonPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(pythonPath, args)
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (c) => { stdout += c.toString() })
      proc.stderr.on('data', (c) => {
        stderr += c.toString()
        process.stderr.write(c)
      })
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Python saiu com codigo ${code}. Stderr: ${stderr.slice(0, 500)}`))
        }
        resolve(stdout.trim())
      })
      proc.on('error', (err) =>
        reject(new Error(`Falha ao iniciar Python: ${err.message}`))
      )
    })
  }
}