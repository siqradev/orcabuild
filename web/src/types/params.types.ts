import type { Source, ItemType, TableType } from './api.types'

// GET /items
export interface ListItemsParams {
  page?:      number
  limit?:     number
  type?:      ItemType
  source?:    Source
  tableType?: TableType
  state?:     string
  year?:      number
  tableId?:   string
}

// GET /items/search  (q mínimo 2 chars — exigência da API)
export interface SearchItemsParams {
  q:          string
  source?:    Source
  tableType?: TableType
  state?:     string
  year?:      number
  tableId?:   string
}

// GET /compositions/:code/resolve
export interface ResolveCompositionParams {
  tableId: string   // obrigatório
  qty?:    number   // padrão: 1
}

// GET /compositions/:code/children | /parents
export interface CompositionRelationParams {
  tableId: string   // obrigatório
}

// POST /import  (SINAPI)
export interface SinapiImportPayload {
  state?:    string   // padrão: "CE"
  month:     number
  year:      number
  filePath?: string   // caminho local opcional — senão usa o scraper
}

// POST /import/seinfra
export interface SeinfraImportPayload {
  version:      '028' | '028.1'
  insumos:      string          // caminho absoluto no servidor da API
  planos:       string
  composicoes?: string
}
