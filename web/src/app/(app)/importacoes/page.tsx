'use client'

import { formatDate, formatJobReference, parseJobLogs, formatDuration } from '@/lib/formatters'
import { useImportJobs } from '@/features/imports/hooks/useImportJobs'
import type { JobStatus } from '@/types/api.types'

const statusConfig: Record<JobStatus, { label: string; class: string }> = {
  PENDING: { label: 'Aguardando', class: 'bg-yellow-500/10 text-yellow-600' },
  RUNNING: { label: 'Rodando',    class: 'bg-blue-500/10 text-blue-600' },
  SUCCESS: { label: 'Concluído',  class: 'bg-emerald-500/10 text-emerald-600' },
  FAILED:  { label: 'Falhou',     class: 'bg-red-500/10 text-red-600' },
}

export default function ImportacoesPage() {
  const { data: jobs, isLoading, isError } = useImportJobs()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-medium text-foreground">Importações</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Gestão de jobs ETL — SINAPI e SEINFRA-CE
          </p>
        </div>
      </div>

      {/* Tabela de jobs */}
      <div className="rounded-lg border border-border/50 bg-background overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fonte</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Referência</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Itens</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Duração</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Iniciado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Erro ao carregar jobs — verifique se a API está rodando
                </td>
              </tr>
            )}

            {!isLoading && !isError && jobs?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhuma importação encontrada
                </td>
              </tr>
            )}

            {jobs?.map((job) => {
              const logs = parseJobLogs(job.logs)
              const cfg  = statusConfig[job.status]
              return (
                <tr key={job.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{job.source}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatJobReference(job)}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">
                    {job.itemsCount?.toLocaleString('pt-BR') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">
                    {logs ? formatDuration(logs.durationMs) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.class}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(job.startedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}