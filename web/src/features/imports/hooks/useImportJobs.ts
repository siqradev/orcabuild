import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { importsService } from '@/services/api/imports'
import { toast } from 'sonner'
import type { SinapiImportPayload, SeinfraImportPayload } from '@/types/params.types'

export const importKeys = {
  jobs: ['import', 'jobs'] as const,
  job:  (id: string) => ['import', 'job', id] as const,
}

export function useImportJobs() {
  return useQuery({
    queryKey:        importKeys.jobs,
    queryFn:         importsService.listJobs,
    refetchInterval: 10_000,
    staleTime:       5_000,
  })
}

export function useImportJob(id: string) {
  return useQuery({
    queryKey: importKeys.job(id),
    queryFn:  () => importsService.getJob(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'PENDING' || status === 'RUNNING' ? 2_000 : false
    },
    enabled: !!id,
  })
}

export function useImportSinapi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SinapiImportPayload) => importsService.importSinapi(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: importKeys.jobs })
      toast.success(`SINAPI importado — ${data.itemsCount} itens`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Erro na importação SINAPI')
    },
  })
}

export function useImportSeinfra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SeinfraImportPayload) => importsService.importSeinfra(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: importKeys.jobs })
      toast.success(`SEINFRA importado — ${data.itemsCount} itens`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Erro na importação SEINFRA')
    },
  })
}