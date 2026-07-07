import { budgetClient }                               from './budgetClient'
import type { Budget, CreateBudgetInput, BudgetItem, CreateBudgetItemInput } from '@/types/budget.types'

export const budgetsService = {
  // ── Budgets ───────────────────────────────────────────────
  async listByProject(projectId: string): Promise<Budget[]> {
    const res = await budgetClient.get<Budget[]>(`/projects/${projectId}/budgets`)
    return res.data
  },

  async getById(budgetId: string): Promise<Budget> {
    const res = await budgetClient.get<Budget>(`/budgets/${budgetId}`)
    return res.data
  },

  async create(projectId: string, data: CreateBudgetInput): Promise<Budget> {
    const res = await budgetClient.post<Budget>(`/projects/${projectId}/budgets`, data)
    return res.data
  },

  async update(budgetId: string, data: Partial<CreateBudgetInput>): Promise<Budget> {
    const res = await budgetClient.put<Budget>(`/budgets/${budgetId}`, data)
    return res.data
  },

  async remove(budgetId: string): Promise<void> {
    await budgetClient.delete(`/budgets/${budgetId}`)
  },

  // ── Budget Items ──────────────────────────────────────────
  async listItems(budgetId: string): Promise<BudgetItem[]> {
    const res = await budgetClient.get<BudgetItem[]>(`/budgets/${budgetId}/items`)
    return res.data
  },

  async addItem(budgetId: string, data: CreateBudgetItemInput): Promise<BudgetItem> {
    const res = await budgetClient.post<BudgetItem>(`/budgets/${budgetId}/items`, data)
    return res.data
  },

  async updateItem(budgetId: string, itemId: string, data: Partial<CreateBudgetItemInput>): Promise<BudgetItem> {
    const res = await budgetClient.put<BudgetItem>(`/budgets/${budgetId}/items/${itemId}`, data)
    return res.data
  },

  async removeItem(budgetId: string, itemId: string): Promise<void> {
    await budgetClient.delete(`/budgets/${budgetId}/items/${itemId}`)
  },
}
