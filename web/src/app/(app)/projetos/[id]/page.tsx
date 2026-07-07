'use client'

import { useState }          from 'react'
import { useParams }         from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetClient }      from '@/services/api/budgetClient'
import { formatDate }        from '@/lib/formatters'
import { ArrowLeft, Plus, FileText, Trash2, ArrowRight } from 'lucide-react'
import Link                  from 'next/link'
import { toast }             from 'sonner'
import type { Project }      from '@/types/budget.types'

// ── Types ─────────────────────────────────────────────────────
interface Budget {
  id:          string
  title:       string
  description: string | null
  status:      'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
  version:     number
  totalCost:   string
  currency:    string
  projectId:   string
  createdAt:   string
  updatedAt:   string
}

interface BudgetsResponse {
  data: Budget[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

// ── Status config ─────────────────────────────────────────────
const statusConfig: Record<Budget['status'], { label: string; class: string }> = {
  DRAFT:    { label: 'Rascunho',  class: 'bg-muted text-muted-foreground' },
  REVIEW:   { label: 'Em revisão', class: 'bg-yellow-500/10 text-yellow-600' },
  APPROVED: { label: 'Aprovado',  class: 'bg-emerald-500/10 text-emerald-600' },
  REJECTED: { label: 'Rejeitado', class: 'bg-red-500/10 text-red-600' },
  ARCHIVED: { label: 'Arquivado', class: 'bg-muted text-muted-foreground' },
}

// ── Hooks ─────────────────────────────────────────────────────
function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn:  async () => {
      const res = await budgetClient.get<Project>(`/projects/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

function useBudgets(projectId: string) {
  return useQuery({
    queryKey: ['budgets', projectId],
    queryFn:  async () => {
      const res = await budgetClient.get<BudgetsResponse>(`/projects/${projectId}/budgets`)
      return res.data
    },
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

function useCreateBudget(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; currency: string }) =>
      budgetClient.post<Budget>(`/projects/${projectId}/budgets`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Orçamento criado com sucesso')
    },
    onError: () => toast.error('Erro ao criar orçamento'),
  })
}

function useDeleteBudget(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetClient.delete(`/budgets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', projectId] })
      toast.success('Orçamento removido')
    },
    onError: () => toast.error('Erro ao remover orçamento'),
  })
}

// ── Page ──────────────────────────────────────────────────────
export default function ProjetoDetalhePage() {
  const { id } = useParams<{ id: string }>()

  const { data: project, isLoading: projectLoading } = useProject(id)
  const { data: budgets, isLoading: budgetsLoading } = useBudgets(id)
  const createBudget = useCreateBudget(id)
  const deleteBudget = useDeleteBudget(id)

  const [open, setOpen]   = useState(false)
  const [title, setTitle] = useState('')

  function handleCreate() {
    if (!title.trim()) return
    createBudget.mutate(
      { title: title.trim(), currency: 'BRL' },
      { onSuccess: () => { setTitle(''); setOpen(false) } }
    )
  }

  const totalBudgets = budgets?.meta.total ?? 0
  const budgetList   = budgets?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/projetos"
            className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={12} /> Projetos
          </Link>
          {projectLoading ? (
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          ) : (
            <h1 className="text-[17px] font-medium text-foreground">{project?.name}</h1>
          )}
          <p className="text-[13px] text-muted-foreground">
            {totalBudgets} orçamento(s)
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus size={14} /> Novo Orçamento
        </button>
      </div>

      {/* Formulário rápido */}
      {open && (
        <div className="rounded-lg border border-border/50 bg-background p-4 flex gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Título do orçamento"
            className="flex-1 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={createBudget.isPending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {createBudget.isPending ? 'Criando...' : 'Criar'}
          </button>
          <button
            onClick={() => { setOpen(false); setTitle('') }}
            className="rounded-md border border-border/50 px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Lista de orçamentos */}
      <div className="rounded-lg border border-border/50 bg-background overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50">
          <h2 className="text-[13px] font-medium text-foreground">Orçamentos</h2>
        </div>

        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Título</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Versão</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Criado em</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {budgetsLoading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}

            {!budgetsLoading && budgetList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Nenhum orçamento encontrado</p>
                  <p className="text-[12px] mt-1">Crie o primeiro orçamento para este projeto</p>
                </td>
              </tr>
            )}

            {budgetList.map((budget) => {
              const cfg = statusConfig[budget.status]
              return (
                <tr key={budget.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{budget.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.class}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">v{budget.version}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {parseFloat(budget.totalCost).toLocaleString('pt-BR', { style: 'currency', currency: budget.currency })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(budget.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => deleteBudget.mutate(budget.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <Link
                        href={`/orcamentos/${budget.id}`}
                        className="flex items-center gap-1 text-[12px] text-primary hover:underline"
                      >
                        Abrir <ArrowRight size={12} />
                      </Link>
                    </div>
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
