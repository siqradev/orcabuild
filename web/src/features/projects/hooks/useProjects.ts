'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsService }                        from '@/services/api/projects'
import type { CreateProjectInput }                from '@/types/budget.types'
import { toast }                                  from 'sonner'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn:  () => projectsService.list(),
    staleTime: 30_000,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn:  () => projectsService.getById(id),
    enabled:  !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projeto criado com sucesso')
    },
    onError: () => toast.error('Erro ao criar projeto'),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProjectInput> }) =>
      projectsService.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', id] })
      toast.success('Projeto atualizado')
    },
    onError: () => toast.error('Erro ao atualizar projeto'),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projeto removido')
    },
    onError: () => toast.error('Erro ao remover projeto'),
  })
}
