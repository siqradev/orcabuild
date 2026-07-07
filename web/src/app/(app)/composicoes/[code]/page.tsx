'use client'

import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetClient } from '@/services/api/budgetClient'
import {
  ArrowLeft, Plus, Trash2, X, Loader2, Search,
  GitBranch, Users, Package, Wrench, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────
type Category = 'MAO_DE_OBRA' | 'MATERIAL' | 'EQUIPAMENTO'

interface Insumo {
  compositionId: string
  category: Category
  code: string
  description: string
  unit: string
  coefficient: number
  unitPrice: number
  total: number
  hasPrice: boolean
}

interface CompositionDetail {
  item: { id: string; code: string; description: string; unit: string; encargosSociais: number; bdi: number }
  insumos: Insumo[]
  totals: {
    maoDeObraTotal: number; encargosValor: number
    materialTotal: number; equipamentoTotal: number
    custoDireto: number; bdiValor: number; valorGeral: number
  }
}

interface CatalogItem {
  id: string; code: string; description: string; unit: string; basePrice: string
  priceTable: { id: string; source: string; reference: string }
}

interface PriceTable { id: string; source: string; type: string; state: string; reference: string }

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const categoryConfig: Record<Category, { label: string; icon: typeof Users; color: string }> = {
  MAO_DE_OBRA:  { label: 'Mão de Obra',  icon: Users,    color: 'text-blue-600' },
  MATERIAL:     { label: 'Material',     icon: Package,  color: 'text-emerald-600' },
  EQUIPAMENTO:  { label: 'Equipamento',  icon: Wrench,   color: 'text-orange-600' },
}

export default function ComposicaoDetailPage() {
  const { code }       = useParams<{ code: string }>()
  const searchParams   = useSearchParams()
  const tableId        = searchParams.get('tableId') ?? ''
  const qc             = useQueryClient()

  // Estado do modal de adicionar insumo
  const [addOpen,       setAddOpen]       = useState(false)
  const [addCategory,   setAddCategory]   = useState<Category>('MAO_DE_OBRA')
  const [addSource,     setAddSource]     = useState<'CATALOG' | 'MANUAL'>('CATALOG')
  const [addCoef,       setAddCoef]       = useState('1')
  // Catálogo
  const [catTableId,    setCatTableId]    = useState('')
  const [catSearch,     setCatSearch]     = useState('')
  const [catSelected,   setCatSelected]   = useState<CatalogItem | null>(null)
  // Manual
  const [manDesc,       setManDesc]       = useState('')
  const [manUnit,       setManUnit]       = useState('')
  const [manPrice,      setManPrice]      = useState('')
  // Encargos/BDI
  const [editEncargos,  setEditEncargos]  = useState(false)
  const [encargosVal,   setEncargosVal]   = useState('')
  const [bdiVal,        setBdiVal]        = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['composition-detail', code, tableId],
    queryFn: async () => {
      const res = await budgetClient.get<CompositionDetail>(
        `/compositions/${code}/detail?tableId=${tableId}`
      )
      return res.data
    },
    enabled: !!code && !!tableId,
    staleTime: 10_000,
  })

  const { data: tables } = useQuery({
    queryKey: ['price-tables'],
    queryFn: async () => (await budgetClient.get<PriceTable[]>('/price-tables')).data,
    staleTime: 5 * 60_000,
  })

  const { data: catalogResults, isFetching: catalogLoading } = useQuery({
    queryKey: ['sinapi-search', catSearch, catTableId],
    queryFn: async () => {
      const p = new URLSearchParams({ q: catSearch, tableId: catTableId, limit: '15' })
      return (await budgetClient.get<{ items: CatalogItem[] }>(`/sinapi/search?${p}`)).data
    },
    enabled: catSearch.length >= 2 && !!catTableId,
    staleTime: 60_000,
  })

  const addInsumo = useMutation({
    mutationFn: (body: any) => budgetClient.post(`/compositions/${code}/insumos`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['composition-detail', code, tableId] })
      toast.success('Insumo adicionado')
      setAddOpen(false)
      setCatSearch(''); setCatSelected(null); setAddCoef('1')
      setManDesc(''); setManUnit(''); setManPrice('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Erro ao adicionar insumo'),
  })

  const removeInsumo = useMutation({
    mutationFn: (compositionId: string) => budgetClient.delete(`/compositions/insumos/${compositionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['composition-detail', code, tableId] })
      toast.success('Insumo removido')
    },
    onError: () => toast.error('Erro ao remover insumo'),
  })

  const updatePricing = useMutation({
    mutationFn: (body: { encargosSociais?: number; bdi?: number }) =>
      budgetClient.patch(`/compositions/${code}/pricing`, { tableId, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['composition-detail', code, tableId] })
      toast.success('Parâmetros atualizados')
      setEditEncargos(false)
    },
    onError: () => toast.error('Erro ao atualizar parâmetros'),
  })

  function handleAddInsumo() {
    const coefficient = parseFloat(addCoef)
    if (isNaN(coefficient) || coefficient <= 0) {
      toast.error('Coeficiente inválido'); return
    }

    if (addSource === 'CATALOG') {
      if (!catSelected) { toast.error('Selecione um item do catálogo'); return }
      addInsumo.mutate({
        tableId,
        source: 'CATALOG',
        category: addCategory,
        coefficient,
        catalogCode: catSelected.code,
        catalogTableId: catTableId,
      })
    } else {
      const unitPrice = parseFloat(manPrice)
      if (!manDesc.trim() || !manUnit.trim() || isNaN(unitPrice) || unitPrice <= 0) {
        toast.error('Preencha todos os campos do insumo manual'); return
      }
      addInsumo.mutate({
        tableId,
        source: 'MANUAL',
        category: addCategory,
        coefficient,
        description: manDesc,
        unit: manUnit.toUpperCase(),
        unitPrice,
      })
    }
  }

  function InsumoSection({ category }: { category: Category }) {
    const cfg = categoryConfig[category]
    const Icon = cfg.icon
    const insumos = data?.insumos.filter(i => i.category === category) ?? []
    const subtotal = insumos.reduce((a, i) => a + i.total, 0)

    return (
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Icon size={15} className={cfg.color} />
            <span className="text-[12px] font-semibold text-foreground uppercase tracking-wide">{cfg.label}</span>
          </div>
          <button
            onClick={() => { setAddCategory(category); setAddOpen(true) }}
            className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 transition-colors font-medium"
          >
            <Plus size={12} /> Adicionar
          </button>
        </div>

        {insumos.length === 0 && (
          <div className="px-4 py-3 text-[12px] text-muted-foreground">Nenhum item adicionado</div>
        )}

        {insumos.length > 0 && (
          <>
            <div className="grid grid-cols-[100px_1fr_60px_90px_100px_100px_32px] bg-muted/20 border-b border-border/30">
              {['CÓDIGO', 'DESCRIÇÃO', 'UNID.', 'COEF.', 'PREÇO UNIT.', 'TOTAL', ''].map(h => (
                <div key={h} className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</div>
              ))}
            </div>

            {insumos.map(insumo => (
              <div key={insumo.compositionId}
                className="grid grid-cols-[100px_1fr_60px_90px_100px_100px_32px] border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors group items-center">
                <div className="px-3 py-2.5 font-mono text-[11px] text-emerald-600">{insumo.code}</div>
                <div className="px-3 py-2.5 text-[12px] text-foreground">
                  {insumo.description}
                  {!insumo.hasPrice && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] text-yellow-600">
                      <AlertCircle size={9} /> sem preço
                    </span>
                  )}
                </div>
                <div className="px-3 py-2.5 text-[12px] text-muted-foreground">{insumo.unit}</div>
                <div className="px-3 py-2.5 text-[12px] font-mono text-muted-foreground">{insumo.coefficient.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</div>
                <div className="px-3 py-2.5 text-[12px] font-mono text-muted-foreground">{formatBRL(insumo.unitPrice)}</div>
                <div className="px-3 py-2.5 text-[12px] font-mono font-semibold text-foreground">{formatBRL(insumo.total)}</div>
                <div className="px-3 py-2.5 flex items-center justify-center">
                  <button
                    onClick={() => removeInsumo.mutate(insumo.compositionId)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-[100px_1fr_60px_90px_100px_100px_32px] bg-muted/10 border-t border-border/30">
              <div className="col-span-5 px-3 py-2 text-[11px] font-medium text-muted-foreground text-right uppercase tracking-wider">
                Subtotal {cfg.label}
              </div>
              <div className="px-3 py-2 text-[12px] font-semibold text-foreground font-mono">{formatBRL(subtotal)}</div>
              <div />
            </div>
          </>
        )}
      </div>
    )
  }

  if (isLoading) return <div className="py-20 text-center text-muted-foreground text-[13px]">Carregando...</div>
  if (!data)     return <div className="py-20 text-center text-muted-foreground text-[13px]">Composição não encontrada</div>

  const t = data.totals

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/composicoes" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={12} /> Composições
          </Link>
          <h1 className="text-[17px] font-medium text-foreground mt-1 flex items-center gap-2">
            <span className="font-mono text-emerald-600">{data.item.code}</span>
            {data.item.description}
          </h1>
          <p className="text-[12px] text-muted-foreground">Unidade: {data.item.unit}</p>
        </div>
      </div>

      {/* Seções de insumos */}
      <InsumoSection category="MAO_DE_OBRA" />

      {/* Encargos Sociais */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 flex items-center justify-between">
        <div className="text-[12px] text-blue-700">
          <span className="font-semibold">Encargos Sociais</span>
          <span className="text-muted-foreground"> (sobre Mão de Obra)</span>
        </div>
        {editEncargos ? (
          <div className="flex items-center gap-2">
            <input type="number" step="0.01" value={encargosVal} onChange={e => setEncargosVal(e.target.value)}
              className="w-20 rounded border border-border bg-white dark:bg-zinc-800 px-2 py-1 text-[12px] font-mono outline-none focus:border-blue-500 text-right" />
            <span className="text-[12px] text-muted-foreground">%</span>
            <button onClick={() => updatePricing.mutate({ encargosSociais: parseFloat(encargosVal) })}
              className="text-[12px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors">Salvar</button>
            <button onClick={() => setEditEncargos(false)} className="text-muted-foreground"><X size={14} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-mono font-semibold text-blue-700">{data.item.encargosSociais}%</span>
            <span className="text-[12px] font-mono text-blue-600">→ {formatBRL(t.encargosValor)}</span>
            <button onClick={() => { setEncargosVal(String(data.item.encargosSociais)); setEditEncargos(true) }}
              className="text-[11px] text-blue-500 hover:text-blue-700 underline">editar</button>
          </div>
        )}
      </div>

      <InsumoSection category="MATERIAL" />
      <InsumoSection category="EQUIPAMENTO" />

      {/* Totais */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resumo de Custos</p>
        </div>
        <div className="divide-y divide-border/50">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-[12px] text-muted-foreground">Mão de Obra</span>
            <span className="text-[12px] font-mono text-foreground">{formatBRL(t.maoDeObraTotal)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-[12px] text-muted-foreground">Encargos Sociais ({data.item.encargosSociais}%)</span>
            <span className="text-[12px] font-mono text-foreground">{formatBRL(t.encargosValor)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-[12px] text-muted-foreground">Material</span>
            <span className="text-[12px] font-mono text-foreground">{formatBRL(t.materialTotal)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-[12px] text-muted-foreground">Equipamento</span>
            <span className="text-[12px] font-mono text-foreground">{formatBRL(t.equipamentoTotal)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 bg-muted/20">
            <span className="text-[12px] font-semibold text-foreground">Custo Direto</span>
            <span className="text-[13px] font-mono font-bold text-foreground">{formatBRL(t.custoDireto)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground">BDI</span>
              {editEncargos ? null : (
                <button onClick={() => { setBdiVal(String(data.item.bdi)); setEditEncargos(true) }}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline">editar</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground">{data.item.bdi}%</span>
              <span className="text-[12px] font-mono text-foreground">{formatBRL(t.bdiValor)}</span>
            </div>
          </div>
          <div className="flex justify-between px-4 py-3.5 bg-emerald-50 dark:bg-emerald-950/20">
            <span className="text-[13px] font-bold text-emerald-700 uppercase tracking-wide">Valor Geral</span>
            <span className="text-[16px] font-mono font-bold text-emerald-700">{formatBRL(t.valorGeral)}</span>
          </div>
        </div>
      </div>

      {/* Modal adicionar insumo */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold">Adicionar {categoryConfig[addCategory].label}</h2>
              <button onClick={() => setAddOpen(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-4 space-y-3">

              {/* Categoria */}
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.entries(categoryConfig) as [Category, typeof categoryConfig[Category]][]).map(([cat, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <button key={cat} onClick={() => setAddCategory(cat)}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-md border text-[12px] font-medium transition-colors ${
                        addCategory === cat
                          ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700'
                          : 'border-border text-muted-foreground hover:border-emerald-600/40'
                      }`}>
                      <Icon size={13} /> {cfg.label}
                    </button>
                  )
                })}
              </div>

              {/* Fonte */}
              <div className="grid grid-cols-2 gap-2">
                {(['CATALOG', 'MANUAL'] as const).map(src => (
                  <button key={src} onClick={() => setAddSource(src)}
                    className={`py-1.5 rounded-md border text-[12px] font-medium transition-colors ${
                      addSource === src
                        ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700'
                        : 'border-border text-muted-foreground'
                    }`}>
                    {src === 'CATALOG' ? 'Buscar no Catálogo' : 'Digitar Manualmente'}
                  </button>
                ))}
              </div>

              {/* Catálogo */}
              {addSource === 'CATALOG' && (
                <>
                  <select value={catTableId} onChange={e => setCatTableId(e.target.value)}
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-2 text-[13px] outline-none focus:border-emerald-600">
                    <option value="">Selecione a tabela de preços</option>
                    {tables?.map(t => <option key={t.id} value={t.id}>{t.source} — {t.reference} ({t.type}) {t.state}</option>)}
                  </select>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-2 focus-within:border-emerald-600 transition-colors">
                    <Search size={13} className="text-muted-foreground flex-shrink-0" />
                    <input value={catSearch} onChange={e => { setCatSearch(e.target.value); setCatSelected(null) }}
                      placeholder="Buscar por código ou descrição…"
                      className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                      disabled={!catTableId} autoFocus />
                    {catalogLoading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                  </div>
                  {catalogResults?.items && catalogResults.items.length > 0 && (
                    <div className="rounded-md border border-border overflow-hidden max-h-44 overflow-y-auto">
                      {catalogResults.items.map(item => (
                        <button key={item.id} onClick={() => setCatSelected(item)}
                          className={`w-full text-left px-3 py-2 border-b border-border/30 last:border-0 transition-colors ${catSelected?.id === item.id ? 'bg-muted border-l-2 border-l-emerald-600' : 'hover:bg-muted/50'}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-emerald-600">{item.code}</span>
                            <span className="text-[12px] text-foreground truncate flex-1">{item.description}</span>
                            <span className="text-[11px] text-muted-foreground">{item.unit}</span>
                            <span className="text-[12px] font-mono font-semibold">{parseFloat(item.basePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Manual */}
              {addSource === 'MANUAL' && (
                <>
                  <input value={manDesc} onChange={e => setManDesc(e.target.value)}
                    placeholder="Descrição do insumo"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" autoFocus />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={manUnit} onChange={e => setManUnit(e.target.value)}
                      placeholder="Unidade (H, M², KG...)"
                      className="rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600 uppercase" />
                    <input type="number" step="0.01" value={manPrice} onChange={e => setManPrice(e.target.value)}
                      placeholder="Preço unitário (R$)"
                      className="rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] font-mono outline-none focus:border-emerald-600" />
                  </div>
                </>
              )}

              {/* Coeficiente */}
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Coeficiente (quantidade por unidade da composição)</label>
                <input type="number" step="0.0001" value={addCoef} onChange={e => setAddCoef(e.target.value)}
                  className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] font-mono outline-none focus:border-emerald-600" />
              </div>

              <button onClick={handleAddInsumo} disabled={addInsumo.isPending}
                className="w-full rounded-md bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {addInsumo.isPending ? <><Loader2 size={14} className="animate-spin" /> Adicionando...</> : <><Plus size={14} /> Adicionar Insumo</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
