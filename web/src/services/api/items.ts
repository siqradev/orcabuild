import { budgetClient } from './budgetClient'
import type { ListItemsParams, SearchItemsParams } from '@/types/params.types'

export const itemsService = {
  list: (params: ListItemsParams) =>
    budgetClient.get('/sinapi/search', { params }).then(r => r.data),

  search: (params: SearchItemsParams) =>
    budgetClient.get('/sinapi/search', { params }).then(r => r.data),

  getByCode: (code: string, tableId: string) =>
    budgetClient.get(`/sinapi/search`, { params: { q: code, tableId } }).then(r => r.data),
}
