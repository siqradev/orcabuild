import { budgetClient as apiClient } from './budgetClient'
import type { SinapiImportPayload, SeinfraImportPayload } from '@/types/params.types'

export const importsService = {
  listJobs: () =>
    apiClient.get('/import/jobs').then(r => r.data),

  getJob: (id: string) =>
    apiClient.get(`/import/jobs/${id}`).then(r => r.data),

  importSinapi: (payload: SinapiImportPayload) =>
    apiClient.post('/import', payload).then(r => r.data),

  importSeinfra: (payload: SeinfraImportPayload) =>
    apiClient.post('/import/seinfra', payload).then(r => r.data),
}
