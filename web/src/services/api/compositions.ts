import { budgetClient } from './budgetClient'

// ─── Resolvedor (árvore recursiva, somente leitura) ─────────────────────────

export const compositionsService = {
  resolve: (code: string, params: { tableId: string; qty?: number }) =>
    budgetClient
      .get(`/compositions/${encodeURIComponent(code)}/resolve`, { params })
      .then(r => r.data),

  getChildren: (code: string, params: { tableId: string }) =>
    budgetClient
      .get(`/compositions/${encodeURIComponent(code)}/children`, { params })
      .then(r => r.data),

  getParents: (code: string, params: { tableId: string }) =>
    budgetClient
      .get(`/compositions/${encodeURIComponent(code)}/parents`, { params })
      .then(r => r.data),

  // ─── Composições Próprias (listagem e edição) ──────────────────────────────

  list: (params: { tableId: string; q?: string }) =>
    budgetClient.get(`/compositions`, { params }).then(r => r.data),

  getDetail: (code: string, tableId: string) =>
    budgetClient
      .get(`/compositions/${encodeURIComponent(code)}/detail`, { params: { tableId } })
      .then(r => r.data),

  addInsumo: (code: string, data: {
    tableId: string
    source: 'CATALOG' | 'MANUAL'
    category: 'MAO_DE_OBRA' | 'MATERIAL' | 'EQUIPAMENTO'
    coefficient: number
    catalogCode?: string
    catalogTableId?: string
    description?: string
    unit?: string
    unitPrice?: number
  }) =>
    budgetClient
      .post(`/compositions/${encodeURIComponent(code)}/insumos`, data)
      .then(r => r.data),

  removeInsumo: (compositionId: string) =>
    budgetClient
      .delete(`/compositions/insumos/${compositionId}`)
      .then(r => r.data),

  updatePricing: (code: string, data: {
    tableId: string
    encargosSociais?: number
    bdi?: number
  }) =>
    budgetClient
      .patch(`/compositions/${encodeURIComponent(code)}/pricing`, data)
      .then(r => r.data),
}