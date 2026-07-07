import { useQuery } from '@tanstack/react-query'
import { itemsService } from '@/services/api/items'
import type { ListItemsParams, SearchItemsParams } from '@/types/params.types'

export const itemsKeys = {
  all:    ['items'] as const,
  list:   (p: ListItemsParams) => ['items', 'list', p] as const,
  search: (q: string) => ['items', 'search', q] as const,
  detail: (code: string, tableId: string) => ['items', code, tableId] as const,
}

export function useItems(params: ListItemsParams) {
  return useQuery({
    queryKey: itemsKeys.list(params),
    queryFn:  () => itemsService.list(params),
    staleTime: 5 * 60_000,
  })
}

export function useItemSearch(q: string, opts?: Omit<ListItemsParams, 'page' | 'limit'>) {
  return useQuery({
    queryKey: itemsKeys.search(q),
    queryFn:  () => itemsService.search({ q, ...opts } as SearchItemsParams),
    enabled:  q.length >= 2,
    staleTime: 60_000,
  })
}

export function useItem(code: string, tableId: string) {
  return useQuery({
    queryKey: itemsKeys.detail(code, tableId),
    queryFn:  () => itemsService.getByCode(code, tableId),
    enabled:  !!code && !!tableId,
    staleTime: 10 * 60_000,
  })
}