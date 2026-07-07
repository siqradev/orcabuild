import { budgetClient }  from './budgetClient'
import type { PriceTable } from '@/types/budget.types'

export const priceTablesService = {
  async list(): Promise<PriceTable[]> {
    const res = await budgetClient.get<PriceTable[]>('/price-tables')
    return res.data
  },
}
