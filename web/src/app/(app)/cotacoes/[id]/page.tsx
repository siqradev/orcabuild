'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetClient } from '@/services/api/budgetClient'
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, X, Loader2,
  AlertTriangle, Crown, Banknote,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────
interface Quote {
  id: string
  quotationId: string
  supplierName: string
  unitPrice: string
  ipi: string | null
  icms: string | null
  freightType: 'FOB' | 'CIF' | null
  notes: string | null
  createdAt: string
}

interface Quotation {
  id: string
  description: string
  unit: string
  status: 'PENDING' | 'OPEN' | 'APPROVED' | 'EXPIRED'
  createdByName: string
  approvedQuoteId: string | null
  approvedAt: string | null
  expiresAt: string | null
  resultItemId: string | null
  createdAt: string
  quotes: Quote[]
}

interface PriceTable {
  id: string; source: string; reference: string; description: string
}

const formatBRL = (v: string | number) =>
  parseFloat(String(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function finalPrice(q: Quote) {
  const base = parseFloat(q.unitPrice)
  const ipi = q.ipi ? parseFloat(q.ipi) / 100 : 0
  const icms = q.icms ? parseFloat(q.icms) / 100 : 0
  return base * (1 + ipi) * (1 + icms)
}

const MIN_QUOTES_REQUIRED = 3

export default function CotacaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [ipi, setIpi] = useState('')
  const [icms, setIcms] = useState('')
  const [freightType, setFreightType] = useState<'FOB' | 'CIF'>('CIF')
  const [notes, setNotes] = useState('')
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => (await budgetClient.get<{ quotation: Quotation }>(`/quotations/${id}`)).data.quotation,
    enabled: !!id,
  })

  const { data: tables } = useQuery({
    queryKey: ['price-tables'],
    queryFn: async () => (await budgetClient.get<PriceTable[]>('/price-tables')).data,
    staleTime: 5 * 60_000,
  })

  const addQuote = useMutation({
    mutationFn: (body: { supplierName: string; unitPrice: number; ipi?: number; icms?: number; freightType?: 'FOB' | 'CIF'; notes?: string }) =>
      budgetClient.post(`/quotations/${id}/quotes`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotation', id] })
      qc.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Cotação registrada')
      setFormOpen(false)
      setSupplierName(''); setUnitPrice(''); setIpi(''); setIcms(''); setNotes('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Erro ao registrar cotação'),
  })

  const removeQuote = useMutation({
    mutationFn: (quoteId: string) => budgetClient.delete(`/quotations/quotes/${quoteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotation', id] })
      toast.success('Cotação removida')
    },
    onError: () => toast.error('Erro ao remover'),
  })

  const approve = useMutation({
    mutationFn: (quoteId: string) => {
      const ownTable = tables?.find(t => t.source === 'PROPRIA')
      if (!ownTable) throw new Error('Tabela própria não encontrada')
      return budgetClient.post(`/quotations/${id}/approve`, { quoteId, priceTableId: ownTable.id })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotation', id] })
      qc.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Cotação aprovada! O preço já está disponível para uso no orçamento.')
      setConfirmApprove(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Erro ao aprovar'),
  })

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground text-[13px]">Carregando...</div>
  }

  if (!data) {
    return <div className="py-20 text-center text-muted-foreground text-[13px]">Cotação não encontrada</div>
  }

  const sortedQuotes = [...data.quotes].sort((a, b) => finalPrice(a) - finalPrice(b))
  const bestQuoteId = sortedQuotes[0]?.id
  const canApprove = data.status !== 'APPROVED' && data.quotes.length >= MIN_QUOTES_REQUIRED

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/cotacoes" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={12} /> Cotações
          </Link>
          <h1 className="text-[17px] font-medium text-foreground mt-1">{data.description}</h1>
          <p className="text-[13px] text-muted-foreground">
            Unidade: {data.unit} · Criada por {data.createdByName}
          </p>
        </div>
        {data.status !== 'APPROVED' && (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <Plus size={14} /> Adicionar Cotação
          </button>
        )}
      </div>

      {/* Status aprovado */}
      {data.status === 'APPROVED' && (
        <div className="rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-emerald-700">Cotação aprovada</p>
            <p className="text-[12px] text-muted-foreground">
              Aprovada em {data.approvedAt && new Date(data.approvedAt).toLocaleDateString('pt-BR')} ·
              Válida até {data.expiresAt && new Date(data.expiresAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      )}

      {/* Aviso de mínimo de cotações */}
      {data.status !== 'APPROVED' && data.quotes.length < MIN_QUOTES_REQUIRED && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0" />
          <p className="text-[12px] text-yellow-700">
            São necessárias ao menos {MIN_QUOTES_REQUIRED} cotações para aprovar uma vencedora.
            Faltam {MIN_QUOTES_REQUIRED - data.quotes.length}.
          </p>
        </div>
      )}

      {/* Mapa Comparativo */}
      <div className="rounded-lg border border-border/50 bg-background overflow-hidden text-[13px]">
        <div className="grid grid-cols-[1fr_110px_70px_70px_80px_120px_90px] bg-muted/60 border-b border-border">
          {['Fornecedor', 'Preço Base', 'IPI', 'ICMS', 'Frete', 'Preço Final', ''].map(h => (
            <div key={h} className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</div>
          ))}
        </div>

        {sortedQuotes.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Banknote className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-[13px]">Nenhuma cotação registrada ainda</p>
          </div>
        )}

        {sortedQuotes.map(quote => {
          const isWinner = quote.id === data.approvedQuoteId
          const isBest = quote.id === bestQuoteId && data.status !== 'APPROVED'

          return (
            <div
              key={quote.id}
              className={`grid grid-cols-[1fr_110px_70px_70px_80px_120px_90px] border-b border-border/20 last:border-0 items-center ${
                isWinner ? 'bg-emerald-600/5' : ''
              }`}
            >
              <div className="px-3 py-3">
                <div className="flex items-center gap-1.5">
                  {isWinner && <Crown size={13} className="text-emerald-600" />}
                  <span className="font-medium text-foreground">{quote.supplierName}</span>
                  {isBest && !isWinner && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/10 text-emerald-700 font-medium">Melhor preço</span>
                  )}
                </div>
                {quote.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{quote.notes}</p>}
              </div>
              <div className="px-3 py-3 font-mono text-muted-foreground">{formatBRL(quote.unitPrice)}</div>
              <div className="px-3 py-3 text-muted-foreground">{quote.ipi ? `${quote.ipi}%` : '—'}</div>
              <div className="px-3 py-3 text-muted-foreground">{quote.icms ? `${quote.icms}%` : '—'}</div>
              <div className="px-3 py-3 text-muted-foreground">{quote.freightType ?? '—'}</div>
              <div className="px-3 py-3 font-mono font-semibold text-foreground">{formatBRL(finalPrice(quote))}</div>
              <div className="px-3 py-3 flex items-center justify-center gap-1">
                {data.status !== 'APPROVED' && (
                  <>
                    <button
                      onClick={() => setConfirmApprove(quote.id)}
                      title="Aprovar como vencedora"
                      disabled={!canApprove}
                      className="text-muted-foreground hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                    <button
                      onClick={() => removeQuote.mutate(quote.id)}
                      title="Remover"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal adicionar cotação */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold">Nova Cotação</h2>
              <button onClick={() => setFormOpen(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Fornecedor</label>
                <input
                  value={supplierName} onChange={e => setSupplierName(e.target.value)}
                  placeholder="Nome do fornecedor"
                  className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Preço (R$)</label>
                  <input
                    type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] font-mono outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">IPI (%)</label>
                  <input
                    type="number" step="0.01" value={ipi} onChange={e => setIpi(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] font-mono outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">ICMS (%)</label>
                  <input
                    type="number" step="0.01" value={icms} onChange={e => setIcms(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] font-mono outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Frete</label>
                <div className="flex gap-2">
                  {(['FOB', 'CIF'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFreightType(opt)}
                      className={`flex-1 rounded-md border px-3 py-1.5 text-[13px] transition-colors ${
                        freightType === opt
                          ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 font-medium'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Observações (opcional)</label>
                <input
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Prazo de entrega, condições..."
                  className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600"
                />
              </div>
              <button
                onClick={() => addQuote.mutate({
                  supplierName,
                  unitPrice: parseFloat(unitPrice),
                  ipi: ipi ? parseFloat(ipi) : undefined,
                  icms: icms ? parseFloat(icms) : undefined,
                  freightType,
                  notes: notes || undefined,
                })}
                disabled={!supplierName || !unitPrice || addQuote.isPending}
                className="w-full rounded-md bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {addQuote.isPending ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Registrar Cotação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de aprovação */}
      {confirmApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-yellow-600" />
              <h2 className="text-[14px] font-semibold">Confirmar aprovação</h2>
            </div>
            <p className="text-[13px] text-muted-foreground mb-4">
              Essa cotação será marcada como vencedora e o preço ficará disponível para uso em orçamentos por 6 meses. Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmApprove(null)}
                className="flex-1 rounded-md border border-border px-4 py-2 text-[13px] text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => approve.mutate(confirmApprove)}
                disabled={approve.isPending}
                className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {approve.isPending ? 'Aprovando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
