import type { ImportJob, ImportLogs } from '@/types/api.types'

// Formata valor monetário — basePrice vem como string da API (Decimal)
export function formatCurrency(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  if (isNaN(n)) return 'R$ —'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Parseia o campo logs (JSON stringificado) de um ImportJob
export function parseJobLogs(logsJson: string | null): ImportLogs | null {
  if (!logsJson) return null
  try { return JSON.parse(logsJson) } catch { return null }
}

// Formata duração em ms para exibição legível
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${m}m ${s}s`
}

// Formata referência legível de um job
export function formatJobReference(job: ImportJob): string {
  if (job.source === 'SEINFRA') {
    return `SEINFRA ${job.version} — CE (${job.type ?? ''})`
  }
  const m = String(job.month ?? '').padStart(2, '0')
  return `${job.source} ${m}/${job.year} — ${job.state} (${job.type ?? ''})`
}

// Formata data ISO para pt-BR
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}
