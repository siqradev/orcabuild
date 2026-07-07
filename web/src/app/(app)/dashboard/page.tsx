'use client'

import { useQuery }        from '@tanstack/react-query'
import { budgetClient }    from '@/services/api/budgetClient'
import { formatDate }      from '@/lib/formatters'
import { FolderOpen, FileText, Wifi, WifiOff, ArrowRight } from 'lucide-react'
import Link                from 'next/link'
import type { Project }    from '@/types/budget.types'

interface ProjectsResponse {
  data: Project[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface EtlStatus {
  etlApi: { url: string; status: 'online' | 'offline' }
}

function useProjectsSummary() {
  return useQuery({
    queryKey: ['dashboard', 'projects'],
    queryFn:  async () => {
      const res = await budgetClient.get<ProjectsResponse>('/projects?limit=5')
      return res.data
    },
    staleTime: 30_000,
  })
}

function useEtlStatus() {
  return useQuery({
    queryKey: ['dashboard', 'etl-status'],
    queryFn:  async () => {
      const res = await budgetClient.get<EtlStatus>('/sinapi/status')
      return res.data
    },
    staleTime: 60_000,
    retry: false,
  })
}

const statusLabel: Record<string, { label: string; class: string }> = {
  ACTIVE:    { label: 'Ativo',     class: 'bg-emerald-500/10 text-emerald-600' },
  ARCHIVED:  { label: 'Arquivado', class: 'bg-muted text-muted-foreground' },
  COMPLETED: { label: 'Concluído', class: 'bg-blue-500/10 text-blue-600' },
}

export default function DashboardPage() {
  const { data: projects, isLoading: projectsLoading } = useProjectsSummary()
  const { data: etlData,  isLoading: etlLoading }      = useEtlStatus()

  const totalProjects = projects?.meta.total ?? 0
  const recentProjects = projects?.data.slice(0, 5) ?? []
  const etlOnline = etlData?.etlApi.status === 'online'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-medium text-foreground">Dashboard</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Visão geral do sistema de orçamentos
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3">
        {/* Total de Projetos */}
        <div className="rounded-lg border border-border/50 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen size={14} className="text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Projetos
            </p>
          </div>
          <p className="text-[26px] font-semibold leading-none tracking-tight text-emerald-600">
            {projectsLoading ? '—' : totalProjects.toLocaleString('pt-BR')}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">cadastrados</p>
        </div>

        {/* Orçamentos — placeholder até ter endpoint global */}
        <div className="rounded-lg border border-border/50 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Orçamentos
            </p>
          </div>
          <p className="text-[26px] font-semibold leading-none tracking-tight text-blue-600">
            —
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">acesse um projeto</p>
        </div>

        {/* Status ETL */}
        <div className="rounded-lg border border-border/50 bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            {etlLoading ? (
              <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
            ) : etlOnline ? (
              <Wifi size={14} className="text-emerald-600" />
            ) : (
              <WifiOff size={14} className="text-red-500" />
            )}
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              ETL API
            </p>
          </div>
          <p className={`text-[26px] font-semibold leading-none tracking-tight ${
            etlLoading ? 'text-muted-foreground' :
            etlOnline  ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {etlLoading ? '—' : etlOnline ? 'Online' : 'Offline'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {etlData?.etlApi.url ?? 'localhost:3001'}
          </p>
        </div>
      </div>

      {/* Projetos recentes */}
      <div className="rounded-lg border border-border/50 bg-background overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-foreground">Projetos recentes</h2>
          <Link
            href="/projetos"
            className="text-[12px] text-primary hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>

        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nome</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Localização</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Criado em</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {projectsLoading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: 4 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}

            {!projectsLoading && recentProjects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum projeto encontrado —{' '}
                  <Link href="/projetos" className="text-primary hover:underline">
                    criar primeiro projeto
                  </Link>
                </td>
              </tr>
            )}

            {recentProjects.map((project) => {
              const cfg = statusLabel[project.status] ?? statusLabel.ACTIVE
              return (
                <tr key={project.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{project.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{project.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.class}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(project.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/projetos/${project.id}`}
                      className="text-[12px] text-primary hover:underline flex items-center justify-end gap-1"
                    >
                      Ver <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
