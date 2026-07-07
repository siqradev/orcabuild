'use client'

import { useImportJobs } from '@/features/imports/hooks/useImportJobs'
import { formatDate, formatJobReference, parseJobLogs, formatDuration } from '@/lib/formatters'
import type { JobStatus } from '@/types/api.types'
import { useState } from 'react'

const statusConfig: Record<JobStatus, { label: string; class: string }> = {
  PENDING: { label: 'Aguardando', class: 'bg-yellow-500/10 text-yellow-600' },
  RUNNING: { label: 'Rodando',    class: 'bg-blue-500/10 text-blue-600' },
  SUCCESS: { label: 'Concluído',  class: 'bg-emerald-500/10 text-emerald-600' },
  FAILED:  { label: 'Falhou',     class: 'bg-red-500/10 text-red-600' },
}

export default function LogsPage() {
  const { data: jobs, isLoading } = useImportJobs()
  const [selected, setSelected] = useState<string | null>(null)

  const selectedJob = jobs?.find((j) => j.id === selected)
  const logs = parseJobLogs(selectedJob?.logs ?? null)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-medium text-foreground">Logs ETL</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Histórico de execução dos pipelines
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Lista de jobs */}
        <div className="rounded-lg border border-border/50 bg-background overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <h2 className="text-[13px] font-medium text-foreground">Jobs</h2>
          </div>
          <div className="divide-y divide-border/50">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              </div>
            ))}

            {!isLoading && jobs?.length === 0 && (
              <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                Nenhum job encontrado
              </div>
            )}

            {jobs?.map((job) => {
              const cfg = statusConfig[job.status]
              return (
                <button
                  key={job.id}
                  onClick={() => setSelected(job.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors ${
                    selected === job.id ? 'bg-muted/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium text-foreground">
                      {formatJobReference(job)}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.class}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{formatDate(job.startedAt)}</span>
                    {job.itemsCount && (
                      <span>{job.itemsCount.toLocaleString('pt-BR')} itens</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detalhes do job selecionado */}
        <div className="rounded-lg border border-border/50 bg-background overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <h2 className="text-[13px] font-medium text-foreground">
              {selectedJob ? formatJobReference(selectedJob) : 'Detalhes'}
            </h2>
          </div>

          {!selectedJob && (
            <div className="flex items-center justify-center py-24 text-[13px] text-muted-foreground">
              Selecione um job para ver os detalhes
            </div>
          )}

          {selectedJob && (
            <div className="p-4 space-y-4">
              {/* Info geral */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Fonte',    value: selectedJob.source },
                  { label: 'Status',   value: statusConfig[selectedJob.status].label },
                  { label: 'Estado',   value: selectedJob.state },
                  { label: 'Tipo',     value: selectedJob.type ?? '—' },
                  { label: 'Iniciado', value: formatDate(selectedJob.startedAt) },
                  { label: 'Finalizado', value: formatDate(selectedJob.finishedAt) },
                ].map((item) => (
                  <div key={item.label} className="rounded-md bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {item.label}
                    </p>
                    <p className="text-[13px] text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Logs parseados */}
              {logs && (
                <div className="rounded-md bg-muted/30 p-3 space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Resumo da importação
                  </p>
                  {[
                    { label: 'Itens onerada',    value: logs.itemsOnerada.toLocaleString('pt-BR') },
                    { label: 'Itens desonerada', value: logs.itemsDesonerada.toLocaleString('pt-BR') },
                    { label: 'Composições',      value: logs.compositions.toLocaleString('pt-BR') },
                    { label: 'Duração',          value: formatDuration(logs.durationMs) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-[13px]">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* JSON raw */}
              {selectedJob.logs && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    JSON raw
                  </p>
                  <pre className="rounded-md bg-muted/50 p-3 text-[11px] font-mono text-muted-foreground overflow-auto max-h-48">
                    {JSON.stringify(logs, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}