'use client'

import { useQuery }     from '@tanstack/react-query'
import { budgetClient } from '@/services/api/budgetClient'
import type { PriceTable } from '@/types/budget.types'

// Shape do item retornado pelo /sinapi/search
export interface CatalogItem {
  id:          string
  code:        string
  description: string
  unit:        string
  basePrice:   string   // vem como string da ETL — usar parseFloat()
  type:        'INSUMO' | 'COMPOSICAO'
  category:    string | null
  priceTable:  Pick<PriceTable, 'id' | 'source' | 'type' | 'state' | 'reference'>
}

export interface CatalogSearchResult {
  items: CatalogItem[]
}

interface SearchParams {
  q:       string
  tableId: string
  type?:   'INSUMO' | 'COMPOSICAO'
  limit?:  number
}

export function useCatalogSearch(params: SearchParams) {
  return useQuery({
    queryKey: ['sinapi', 'search', params],
    queryFn:  async () => {
      const p = new URLSearchParams({ q: params.q, tableId: params.tableId })
      if (params.type)  p.set('type',  params.type)
      if (params.limit) p.set('limit', String(params.limit))
      const res = await budgetClient.get<CatalogSearchResult>(`/sinapi/search?${p}`)
      return res.data
    },
    enabled:   params.q.length >= 2 && !!params.tableId,
    staleTime: 60_000,
  })
}
