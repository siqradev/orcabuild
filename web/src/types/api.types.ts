// ─── Enums — idênticos ao Prisma ──────────────────────────────────────────────
export type Source       = 'SINAPI' | 'SEINFRA' | 'SICRO' | 'EMBASA' | 'CPOS' | 'ORSE'
export type ItemType     = 'INSUMO' | 'COMPOSICAO'
export type TableType    = 'ONERADA' | 'DESONERADA'
export type JobStatus    = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
export type BudgetStatus = 'RASCUNHO' | 'FINALIZADO' | 'APROVADO'

// ─── PriceTable ───────────────────────────────────────────────────────────────
export interface PriceTable {
  id:          string
  source:      Source
  type:        TableType | null
  state:       string
  month:       number | null    // SINAPI/SICRO — mês de referência
  year:        number | null    // SINAPI/SICRO — ano de referência
  version:     string | null    // SEINFRA/EMBASA — ex: "028", "028.1"
  reference:   string           // label legível: "03/2026" ou "028"
  description: string | null
  isActive:    boolean
  publishedAt: string | null
  createdAt:   string
  updatedAt:   string
  deletedAt:   string | null
}

// ─── Item ─────────────────────────────────────────────────────────────────────
export interface Item {
  id:           string
  code:         string
  description:  string
  searchText:   string | null   // pré-normalizado sem acentos/lowercase
  unit:         string
  type:         ItemType
  category:     string | null
  basePrice:    string | null   // Decimal(12,4) serializado como string — use parseFloat()
  priceTableId: string
  priceTable?:  PriceTable
  createdAt:    string
  updatedAt:    string
  deletedAt:    string | null
}

// ─── Composition — relação pai → filho ────────────────────────────────────────
export interface CompositionRelation {
  id:           string
  parentItemId: string
  childItemId:  string
  coefficient:  string          // Decimal(12,6) como string
  unit:         string | null
  parentItem?:  Item
  childItem?:   Item
}

// ─── Árvore resolvida recursivamente (GET /compositions/:code/resolve) ─────────
export interface CompositionNode {
  code:        string
  description: string
  unit:        string
  type:        ItemType
  coefficient: number
  unitPrice:   number
  totalCost:   number
  children:    CompositionNode[]
}

export interface CompositionResolveResult {
  code:        string
  description: string
  tableId:     string
  quantity:    number
  totalCost:   number
  breakdown: {
    material:    number
    maoDeObra:   number
    equipamento: number
    outros:      number
  }
  tree: CompositionNode[]
}

// ─── ImportJob ────────────────────────────────────────────────────────────────
export interface ImportJob {
  id:           string
  source:       Source
  status:       JobStatus
  state:        string
  type:         TableType | null
  month:        number | null
  year:         number | null
  version:      string | null
  itemsCount:   number | null
  logs:         string | null   // JSON stringificado de ImportLogs
  priceTableId: string | null
  startedAt:    string
  finishedAt:   string | null
  priceTable?:  PriceTable
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

export interface ImportResult {
  jobId:             string
  tableIds:          { onerada: string | null; desonerada: string | null }
  itemsCount:        number
  compositionsCount: number
  message:           string
  logs:              ImportLogs
}

// ─── Respostas paginadas ───────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items:      T[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

export interface SearchResponse<T> {
  results: T[]
  count:   number
}

// ─── Health ───────────────────────────────────────────────────────────────────
export interface HealthResponse {
  status:    string
  service:   string
  database:  string
  timestamp: string
}
