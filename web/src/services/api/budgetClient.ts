import axios, { AxiosError } from 'axios'

export const budgetClient = axios.create({
  baseURL: '/api/budget',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

budgetClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    if (status === 401) {
      window.location.href = '/login'
    }
    if (status === 403) console.error('[Budget API] Sem permissão:', error.config?.url)
    if (status === 404) console.warn('[Budget API] Recurso não encontrado:', error.config?.url)
    if (status === 500) console.error('[Budget API] Erro interno:', error.config?.url)
    return Promise.reject(error)
  }
)
