import { useQuery } from '@tanstack/react-query'
import { tablesService } from '@/services/api/tables'

export function usePriceTables() {
  return useQuery({
    queryKey: ['price-tables'],
    queryFn:  tablesService.list,
    staleTime: 10 * 60_000,
  })
}