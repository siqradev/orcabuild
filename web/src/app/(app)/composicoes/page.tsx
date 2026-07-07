'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { budgetClient } from '@/services/api/budgetClient'
import { authStorage } from '@/lib/auth'
import { GitBranch, ChevronRight, Plus, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface PriceTable { id: string; source: string; reference: string; description: string }
interface CatalogItem {
  id: string; code: string; description: string; unit: string
  basePrice: string | null; type: string
}

const formatBRL = (v: string | number | null | undefined) => {
  const n = parseFloat(String(v ?? 0))
  return (isNaN(n) ? 0 : n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ComposicoesPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [desc, setDesc] = useState('')
  const [unit, setUnit] = useState('')

  const { data: tables } = useQuery({
    queryKey: ['price-tables'],
    queryFn: async () => (await budgetClient.get<PriceTable[]>('/price-tables')).data,
    staleTime: 5 * 60_000,
  })

  const ownTable = tables?.find(t => t.source === 'PROPRIA')
  const ownTableId = ownTable?.id

  const { data: compositions, isLoading } = useQuery({
    queryKey: ['own-compositions', ownTableId],
    queryFn: async () => {
      const p = new URLSearchParams({ tableId: ownTableId!, type: 'COMPOSICAO', limit: '100' })
      const res = await budgetClient.get<{ items: CatalogItem[]; total: number }>(`/price-tables/items?${p}`)
      return res.data.items
    },
    enabled: !!ownTableId,
    staleTime: 15_000,
  })

  const createComposition = useMutation({
    mutationFn: async (data: { description: string; unit: string }) => {
      const user = authStorage.getUser()
      return budgetClient.post('/compositions/create', {
        description: data.description,
        unit: data.unit,
        priceTableId: ownTableId,
        createdByUserId: user?.id ?? 'unknown',
        createdByName: user?.name ?? 'Usuário',
      })
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['own-compositions', ownTableId] })
      toast.success('Composição criada com sucesso')
      setCreateOpen(false)
      setDesc(''); setUnit('')
      const code = res.data?.item?.code
      if (code) router.push(`/composicoes/${code}?tableId=${ownTableId}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Erro ao criar composição'),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[17px] font-medium text-foreground flex items-center gap-2">
            <GitBranch size={18} className="text-emerald-600" /> Composições Próprias
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Serviços personalizados montados com Mão de Obra, Material e Equipamento
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus size={14} /> Nova Composição
        </button>
      </div>

      <div className="rounded-lg border border-border/50 bg-background overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_80px_140px_36px] bg-muted/60 border-b border-border">
          {['CÓDIGO', 'DESCRIÇÃO', 'UNID.', 'VALOR GERAL', ''].map(h => (
            <div key={h} className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</div>
          ))}
        </div>

        {isLoading && (
          <div className="py-12 text-center text-muted-foreground text-[13px]">Carregando composições...</div>
        )}

        {!isLoading && (!compositions || compositions.length === 0) && (
          <div className="py-16 text-center text-muted-foreground">
            <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-[13px]">Nenhuma composição própria ainda</p>
            <p className="text-[12px] mt-1">Clique em "Nova Composição" para começar</p>
          </div>
        )}

        {compositions?.map(c => (
          <Link key={c.id} href={`/composicoes/${c.code}?tableId=${ownTableId}`}
            className="grid grid-cols-[120px_1fr_80px_140px_36px] border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors items-center">
            <div className="px-4 py-3 font-mono text-[12px] text-emerald-600 font-medium">{c.code}</div>
            <div className="px-4 py-3 text-[13px] text-foreground">{c.description}</div>
            <div className="px-4 py-3 text-[13px] text-muted-foreground">{c.unit}</div>
            <div className="px-4 py-3 text-[13px] font-mono font-semibold text-foreground">
              {c.basePrice && parseFloat(c.basePrice) > 0
                ? formatBRL(c.basePrice)
                : <span className="text-yellow-600 text-[11px] font-sans">Aguardando insumos</span>}
            </div>
            <div className="px-4 py-3 flex items-center justify-center">
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>

      {/* Modal criar composição */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold flex items-center gap-2">
                <GitBranch size={15} className="text-emerald-600" /> Nova Composição Própria
              </h2>
              <button onClick={() => setCreateOpen(false)}>
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Descrição do serviço</label>
                <input
                  value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Ex: Assentamento de tijolo ecológico"
                  autoFocus
                  className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Unidade de medida</label>
                <input
                  value={unit} onChange={e => setUnit(e.target.value.toUpperCase())}
                  placeholder="M², M³, UN, VB..."
                  className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600 uppercase"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Após criar, você vai montar os insumos (Mão de Obra, Material, Equipamento) na próxima tela.
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setCreateOpen(false)}
                  className="flex-1 rounded-md border border-border px-4 py-2 text-[13px] text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => createComposition.mutate({ description: desc, unit })}
                  disabled={!desc.trim() || !unit.trim() || createComposition.isPending}
                  className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {createComposition.isPending
                    ? <><Loader2 size={14} className="animate-spin" /> Criando...</>
                    : <><Plus size={14} /> Criar e Montar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}