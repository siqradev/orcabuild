'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsService }                         from '@/services/api/budgets'
import type { CreateBudgetInput, CreateBudgetItemInput } from '@/types/budget.types'
import { toast }                                  from 'sonner'

export function useBudgets(projectId: string) {
  return useQuery({
    queryKey: ['budgets', projectId],
    queryFn:  () => budgetsService.listByProject(projectId),
    enabled:  !!projectId,
    staleTime: 30_000,
  })
}

export function useBudget(budgetId: string) {
  return useQuery({
    queryKey: ['budgets', 'detail', budgetId],
    queryFn:  () => budgetsService.getById(budgetId),
    enabled:  !!budgetId,
  })
}

export function useBudgetItems(budgetId: string) {
  return useQuery({
    queryKey: ['budget-items', budgetId],
    queryFn:  () => budgetsService.listItems(budgetId),
    enabled:  !!budgetId,
  })
}

export function useCreateBudget(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBudgetInput) => budgetsService.create(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', projectId] })
      toast.success('Orçamento criado com sucesso')
    },
    onError: () => toast.error('Erro ao criar orçamento'),
  })
}

export function useAddBudgetItem(budgetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBudgetItemInput) => budgetsService.addItem(budgetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-items', budgetId] })
      toast.success('Item adicionado ao orçamento')
    },
    onError: () => toast.error('Erro ao adicionar item'),
  })
}

export function useRemoveBudgetItem(budgetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => budgetsService.removeItem(budgetId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-items', budgetId] })
      toast.success('Item removido')
    },
    onError: () => toast.error('Erro ao remover item'),
  })
}
