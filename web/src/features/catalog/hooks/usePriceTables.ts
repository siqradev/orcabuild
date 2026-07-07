'use client'

import { useQuery }          from '@tanstack/react-query'
import { priceTablesService } from '@/services/api/price-tables'

export function usePriceTables() {
  return useQuery({
    queryKey: ['price-tables'],
    queryFn:  () => priceTablesService.list(),
    staleTime: 5 * 60_000, // tabelas mudam pouco — cache de 5min
  })
}
