import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { compositionsService } from '@/services/api/compositions'

export const compositionKeys = {
  resolve:  (code: string, tableId: string, qty: number) =>
    ['compositions', 'resolve', code, tableId, qty] as const,
  children: (code: string, tableId: string) =>
    ['compositions', 'children', code, tableId] as const,
  parents:  (code: string, tableId: string) =>
    ['compositions', 'parents', code, tableId] as const,
  list:     (tableId: string, q?: string) =>
    ['compositions', 'list', tableId, q ?? ''] as const,
  detail:   (code: string, tableId: string) =>
    ['compositions', 'detail', code, tableId] as const,
}

// ─── Resolvedor (árvore recursiva, somente leitura) ────────────────────────

export function useResolveComposition(code: string, tableId: string, qty = 1) {
  return useQuery({
    queryKey: compositionKeys.resolve(code, tableId, qty),
    queryFn:  () => compositionsService.resolve(code, { tableId, qty }),
    enabled:  !!code && !!tableId,
    staleTime: 15 * 60_000,
  })
}

export function useCompositionChildren(code: string, tableId: string) {
  return useQuery({
    queryKey: compositionKeys.children(code, tableId),
    queryFn:  () => compositionsService.getChildren(code, { tableId }),
    enabled:  !!code && !!tableId,
  })
}

export function useCompositionParents(code: string, tableId: string) {
  return useQuery({
    queryKey: compositionKeys.parents(code, tableId),
    queryFn:  () => compositionsService.getParents(code, { tableId }),
    enabled:  !!code && !!tableId,
  })
}

// ─── Composições Próprias (listagem e edição) ──────────────────────────────

export function useCompositionsList(tableId: string, q?: string) {
  return useQuery({
    queryKey: compositionKeys.list(tableId, q),
    queryFn:  () => compositionsService.list({ tableId, q }),
    enabled:  !!tableId,
  })
}

export function useCompositionDetail(code: string, tableId: string) {
  return useQuery({
    queryKey: compositionKeys.detail(code, tableId),
    queryFn:  () => compositionsService.getDetail(code, tableId),
    enabled:  !!code && !!tableId,
  })
}

export function useAddInsumo(code: string, tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof compositionsService.addInsumo>[1]) =>
      compositionsService.addInsumo(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: compositionKeys.detail(code, tableId) })
      queryClient.invalidateQueries({ queryKey: compositionKeys.list(tableId) })
    },
  })
}

export function useRemoveInsumo(code: string, tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (compositionId: string) =>
      compositionsService.removeInsumo(compositionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: compositionKeys.detail(code, tableId) })
      queryClient.invalidateQueries({ queryKey: compositionKeys.list(tableId) })
    },
  })
}

export function useUpdatePricing(code: string, tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { encargosSociais?: number; bdi?: number }) =>
      compositionsService.updatePricing(code, { tableId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: compositionKeys.detail(code, tableId) })
      queryClient.invalidateQueries({ queryKey: compositionKeys.list(tableId) })
    },
  })
}