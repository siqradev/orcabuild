'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { budgetClient } from '@/services/api/budgetClient'
import { Banknote, Search, ChevronRight, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────
interface Quote {
  id: string
  supplierName: string
  unitPrice: string
}

interface Quotation {
  id: string
  description: string
  unit: string
  status: 'PENDING' | 'OPEN' | 'APPROVED' | 'EXPIRED'
  createdByName: string
  approvedAt: string | null
  expiresAt: string | null
  createdAt: string
  quotes: Quote[]
}

// ── Config ────────────────────────────────────────────────────
const statusConfig: Record<Quotation['status'], { label: string; class: string; icon: typeof Clock }> = {
  PENDING:  { label: 'Aguardando Cotações', class: 'bg-muted text-muted-foreground',           icon: Clock },
  OPEN:     { label: 'Em Análise',          class: 'bg-yellow-500/10 text-yellow-600',         icon: AlertCircle },
  APPROVED: { label: 'Aprovada',            class: 'bg-emerald-500/10 text-emerald-600',       icon: CheckCircle2 },
  EXPIRED:  { label: 'Expirada',            class: 'bg-red-500/10 text-red-600',               icon: AlertCircle },
}

const filterTabs = [
  { label: 'Todas',      value: undefined },
  { label: 'Pendentes',  value: 'PENDING' },
  { label: 'Em Análise', value: 'OPEN' },
  { label: 'Aprovadas',  value: 'APPROVED' },
  { label: 'Expiradas',  value: 'EXPIRED' },
] as const

// ── Page ──────────────────────────────────────────────────────
export default function CotacoesPage() {
  const [filter, setFilter] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', filter],
    queryFn: async () => {
      const params = filter ? `?status=${filter}` : ''
      const res = await budgetClient.get<{ quotations: Quotation[]; count: number }>(`/quotations${params}`)
      return res.data
    },
    staleTime: 15_000,
  })

  const quotations = (data?.quotations ?? []).filter(q =>
    q.description.toLowerCase().includes(search.toLowerCase())
  )

  function minPrice(quotes: Quote[]) {
    if (quotes.length === 0) return null
    return Math.min(...quotes.map(q => parseFloat(q.unitPrice)))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[17px] font-medium text-foreground flex items-center gap-2">
            <Banknote size={18} className="text-emerald-600" /> Cotações
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Mapa comparativo de fornecedores e itens pendentes de precificação
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.label}
            onClick={() => setFilter(tab.value)}
            className={`text-[12px] px-3 py-1.5 rounded-md border transition-colors ${
              filter === tab.value
                ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 font-medium'
                : 'border-border text-muted-foreground hover:border-emerald-600/40 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-2 max-w-md focus-within:border-emerald-600 transition-colors">
        <Search size={14} className="text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por descrição..."
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Lista */}
      <div className="rounded-lg border border-border/50 bg-background overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_140px_160px_36px] bg-muted/60 border-b border-border">
          {['Descrição', 'Unidade', 'Cotações', 'Status', ''].map(h => (
            <div key={h} className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</div>
          ))}
        </div>

        {isLoading && (
          <div className="py-12 text-center text-muted-foreground text-[13px]">Carregando cotações...</div>
        )}

        {!isLoading && quotations.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Banknote className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-[13px]">Nenhuma cotação encontrada</p>
            <p className="text-[12px] mt-1">Cotações pendentes aparecem aqui quando você adiciona um item sem preço a um orçamento</p>
          </div>
        )}

        {quotations.map(q => {
          const cfg = statusConfig[q.status]
          const Icon = cfg.icon
          const best = minPrice(q.quotes)

          return (
            <Link
              key={q.id}
              href={`/cotacoes/${q.id}`}
              className="grid grid-cols-[1fr_100px_140px_160px_36px] border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors items-center"
            >
              <div className="px-4 py-3">
                <p className="text-[13px] font-medium text-foreground">{q.description}</p>
                <p className="text-[11px] text-muted-foreground">por {q.createdByName}</p>
              </div>
              <div className="px-4 py-3 text-[13px] text-muted-foreground">{q.unit}</div>
              <div className="px-4 py-3 text-[13px]">
                {q.quotes.length === 0 ? (
                  <span className="text-muted-foreground">Nenhuma ainda</span>
                ) : (
                  <span className="text-foreground">
                    {q.quotes.length} {q.quotes.length === 1 ? 'cotação' : 'cotações'}
                    {best !== null && (
                      <span className="text-emerald-600 font-mono ml-1">
                        · {best.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.class}`}>
                  <Icon size={11} /> {cfg.label}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-center">
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
