import { budgetClient } from './budgetClient'
import type { PriceTable } from '@/types/budget.types'

export const tablesService = {
  list: (): Promise<PriceTable[]> =>
    budgetClient.get<PriceTable[]>('/price-tables').then(r => r.data),
}
