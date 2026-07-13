'use client'

import { useState, useRef }  from 'react'
import { useParams }         from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetClient }      from '@/services/api/budgetClient'
import {
  ArrowLeft, Search, Plus, Trash2, X, Loader2,
  ChevronDown, ChevronRight, Pencil, Check,
  Printer, FileSpreadsheet, Building2, ChevronUp,
  Banknote, GitBranch, Package, AlertCircle, CheckCircle2,
} from 'lucide-react'
import Link  from 'next/link'
import { toast } from 'sonner'
import type ExcelJS from 'exceljs'

// ── Types ─────────────────────────────────────────────────────
interface BudgetItem {
  id: string; description: string; unit: string
  quantity: string; unitPrice: string; totalPrice: string
  meta: string | null; submeta: string | null
  category: string | null; notes: string | null; sortOrder: number
}
interface BudgetItemsResponse {
  items: BudgetItem[]
  summary: { totalItems: number; totalCost: number; currency: string }
}
interface Budget {
  id: string; title: string; status: string; version: number
  totalCost: string; currency: string; projectId: string
  project: { id: string; name: string }
  companyName?: string; companyCnpj?: string; companyAddress?: string
  companyPhone?: string; companyEmail?: string; companyLogoUrl?: string
  engineerName?: string; engineerCrea?: string
}
interface CatalogItem {
  id: string; code: string; description: string; unit: string
  basePrice: string; type: string; category: string | null
  priceTable: { id: string; source: string; type: string; reference: string }
}
interface PriceTable { id: string; source: string; type: string; state: string; reference: string }
interface QuoteSummary { id: string; supplierName: string; unitPrice: string }
interface QuotationSummary {
  id: string; description: string; unit: string
  status: 'PENDING' | 'OPEN' | 'APPROVED' | 'EXPIRED'
  quotes: QuoteSummary[]
  expiresAt: string | null
}

// ── Helpers ───────────────────────────────────────────────────
const formatBRL = (v: string | number | null | undefined) => {
  const n = parseFloat(String(v ?? 0))
  return (isNaN(n) ? 0 : n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function groupByMeta(items: BudgetItem[]) {
  const m: Record<string, Record<string, BudgetItem[]>> = {}
  for (const item of items) {
    const meta    = item.meta    ?? '(SEM META)'
    const submeta = item.submeta ?? '(SEM SUBMETA)'
    if (!m[meta]) m[meta] = {}
    if (!m[meta][submeta]) m[meta][submeta] = []
    m[meta][submeta].push(item)
  }
  return m
}

const subtotal = (its: BudgetItem[]) =>
  its.reduce((a, i) => a + parseFloat(i.totalPrice), 0)

const statusConfig: Record<string, { label: string; class: string }> = {
  DRAFT:    { label: 'Rascunho',   class: 'bg-muted text-muted-foreground' },
  REVIEW:   { label: 'Em revisão', class: 'bg-yellow-500/10 text-yellow-600' },
  APPROVED: { label: 'Aprovado',   class: 'bg-emerald-500/10 text-emerald-600' },
  REJECTED: { label: 'Rejeitado',  class: 'bg-red-500/10 text-red-600' },
  ARCHIVED: { label: 'Arquivado',  class: 'bg-muted text-muted-foreground' },
}

const quotationStatusConfig: Record<QuotationSummary['status'], { label: string; class: string }> = {
  PENDING:  { label: 'Aguardando Cotações', class: 'bg-muted text-muted-foreground' },
  OPEN:     { label: 'Em Análise',          class: 'bg-yellow-500/10 text-yellow-600' },
  APPROVED: { label: 'Aprovada',            class: 'bg-emerald-500/10 text-emerald-600' },
  EXPIRED:  { label: 'Expirada',            class: 'bg-red-500/10 text-red-600' },
}

// ── Excel export via ExcelJS ──────────────────────────────────
async function exportToExcel(budget: Budget, items: BudgetItem[], totalCost: number) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Orçamento')

  ws.columns = [
    { key: 'num',    width: 12 },
    { key: 'code',   width: 14 },
    { key: 'desc',   width: 62 },
    { key: 'unit',   width: 8  },
    { key: 'qty',    width: 14 },
    { key: 'price',  width: 20 },
    { key: 'total',  width: 20 },
  ]

  const bold   = (size = 11): Partial<ExcelJS.Font> => ({ bold: true, size, name: 'Calibri' })
  const normal = (size = 10): Partial<ExcelJS.Font> => ({ bold: false, size, name: 'Calibri' })
  const border = (): Partial<ExcelJS.Borders> => ({
    top:    { style: 'thin' }, bottom: { style: 'thin' },
    left:   { style: 'thin' }, right:  { style: 'thin' },
  })
  const fill = (argb: string): ExcelJS.Fill => ({
    type: 'pattern', pattern: 'solid', fgColor: { argb },
  })

  const r1 = ws.addRow([budget.companyName ?? 'EMPRESA'])
  r1.getCell(1).font = bold(14)
  ws.mergeCells(`A${r1.number}:G${r1.number}`)

  if (budget.companyCnpj) {
    const r = ws.addRow([`CNPJ: ${budget.companyCnpj}`])
    r.getCell(1).font = normal()
    ws.mergeCells(`A${r.number}:G${r.number}`)
  }
  if (budget.companyAddress) {
    const r = ws.addRow([budget.companyAddress])
    r.getCell(1).font = normal()
    ws.mergeCells(`A${r.number}:G${r.number}`)
  }
  if (budget.companyPhone || budget.companyEmail) {
    const r = ws.addRow([`${budget.companyPhone ?? ''} ${budget.companyEmail ?? ''}`.trim()])
    r.getCell(1).font = normal()
    ws.mergeCells(`A${r.number}:G${r.number}`)
  }

  ws.addRow([])

  const rt = ws.addRow([`ORÇAMENTO: ${budget.title}`])
  rt.getCell(1).font = bold(12)
  ws.mergeCells(`A${rt.number}:G${rt.number}`)

  const rp = ws.addRow([`PROJETO: ${budget.project.name}`, '', '', '', `VERSÃO: v${budget.version}`])
  rp.getCell(1).font = normal()
  rp.getCell(5).font = normal()

  if (budget.engineerName) {
    const re = ws.addRow([`ENGENHEIRO: ${budget.engineerName}`, '', '', '', `CREA: ${budget.engineerCrea ?? ''}`])
    re.getCell(1).font = normal()
    re.getCell(5).font = normal()
  }

  const rd = ws.addRow([`DATA: ${new Date().toLocaleDateString('pt-BR')}`])
  rd.getCell(1).font = normal()

  ws.addRow([])

  const rh = ws.addRow(['Nº', 'CÓDIGO', 'ESPECIFICAÇÃO DO INSUMO', 'UNID.', 'QTDE', 'PREÇO UNIT. (R$)', 'PREÇO TOTAL (R$)'])
  rh.eachCell(cell => {
    cell.font      = { ...bold(10), color: { argb: 'FFFFFFFF' } }
    cell.fill      = fill('FF1F5C3A')
    cell.border    = border()
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  rh.height = 18

  const metaGroups = groupByMeta(items)
  let metaCounter  = 0

  for (const [meta, subgroups] of Object.entries(metaGroups)) {
    metaCounter++
    let submetaCounter = 0
    const metaNum  = String(metaCounter).padStart(2, '0')
    const metaTotal = Object.values(subgroups).reduce((a, its) => a + subtotal(its), 0)

    const rm = ws.addRow([metaNum, '', meta.toUpperCase(), '', '', '', metaTotal])
    rm.eachCell(cell => {
      cell.font      = { ...bold(10), color: { argb: 'FF1F5C3A' } }
      cell.fill      = fill('FFE8F5E9')
      cell.border    = border()
      cell.alignment = { vertical: 'middle' }
    })
    rm.getCell(7).numFmt = 'R$ #,##0.00'
    rm.getCell(7).alignment = { horizontal: 'right' }
    rm.height = 16

    for (const [submeta, subItems] of Object.entries(subgroups)) {
      submetaCounter++
      let subitemCounter = 0
      const submetaNum = `${metaNum}.${String(submetaCounter).padStart(2, '0')}`
      const hasSubmeta = submeta !== '(SEM SUBMETA)'

      if (hasSubmeta) {
        const rs = ws.addRow([submetaNum, '', submeta, '', '', '', ''])
        rs.eachCell(cell => {
          cell.font      = bold(10)
          cell.fill      = fill('FFF5F5F5')
          cell.border    = border()
          cell.alignment = { vertical: 'middle' }
        })
        rs.height = 15
      }

      for (const item of subItems) {
        subitemCounter++
        const codeMatch = item.notes?.match(/\[(SINAPI|SEINFRA|SICRO|PROPRIA)\s+(\S+)\]/)
        const code      = codeMatch?.[2] ?? ''
        const itemNum   = hasSubmeta
          ? `${submetaNum}.${String(subitemCounter).padStart(2, '0')}`
          : `${metaNum}.${String(subitemCounter).padStart(2, '0')}`

        const ri = ws.addRow([
          itemNum, code, item.description, item.unit,
          parseFloat(item.quantity), parseFloat(item.unitPrice), parseFloat(item.totalPrice),
        ])
        ri.eachCell(cell => {
          cell.font   = normal(10)
          cell.border = border()
          cell.alignment = { vertical: 'middle', wrapText: false }
        })
        ri.getCell(5).numFmt = '#,##0.000'
        ri.getCell(5).alignment = { horizontal: 'right' }
        ri.getCell(6).numFmt = 'R$ #,##0.00'
        ri.getCell(6).alignment = { horizontal: 'right' }
        ri.getCell(7).numFmt = 'R$ #,##0.00'
        ri.getCell(7).alignment = { horizontal: 'right' }
        ri.height = 14
      }

      if (hasSubmeta) {
        const rst = ws.addRow(['', '', `TOTAL ${submeta}`, '', '', '', subtotal(subItems)])
        rst.eachCell(cell => {
          cell.font      = bold(10)
          cell.fill      = fill('FFF0F0F0')
          cell.border    = border()
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
        })
        rst.getCell(3).alignment = { horizontal: 'right' }
        rst.getCell(7).numFmt = 'R$ #,##0.00'
        rst.height = 14
      }
    }

    const rmt = ws.addRow(['', '', `TOTAL ${metaNum} — ${meta}`, '', '', '', metaTotal])
    rmt.eachCell(cell => {
      cell.font      = { ...bold(10), color: { argb: 'FF1F5C3A' } }
      cell.fill      = fill('FFE8F5E9')
      cell.border    = border()
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
    })
    rmt.getCell(3).alignment = { horizontal: 'right' }
    rmt.getCell(7).numFmt = 'R$ #,##0.00'
    rmt.height = 16

    ws.addRow([])
  }

  const rg = ws.addRow(['', '', 'TOTAL GERAL DO ORÇAMENTO', '', '', '', totalCost])
  rg.eachCell(cell => {
    cell.font      = { ...bold(12), color: { argb: 'FFFFFFFF' } }
    cell.fill      = fill('FF1F5C3A')
    cell.border    = border()
    cell.alignment = { horizontal: 'right', vertical: 'middle' }
  })
  rg.getCell(3).alignment = { horizontal: 'right' }
  rg.getCell(7).numFmt = 'R$ #,##0.00'
  rg.height = 20

  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = url
  a.download   = `orcamento_${budget.title.replace(/\s+/g, '_')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Excel exportado com sucesso')
}

// ── Page ──────────────────────────────────────────────────────
export default function OrcamentoEditorPage() {
  const { id } = useParams<{ id: string }>()
  const qc     = useQueryClient()

  const { data: budget, refetch: refetchBudget } = useQuery({
    queryKey: ['budget', id],
    queryFn:  async () => (await budgetClient.get<Budget>(`/budgets/${id}`)).data,
    enabled:  !!id,
  })

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['budget-items', id],
    queryFn:  async () => (await budgetClient.get<BudgetItemsResponse>(`/budgets/${id}/items`)).data,
    enabled:  !!id,
    staleTime: 10_000,
  })

  const { data: tables } = useQuery({
    queryKey: ['price-tables'],
    queryFn:  async () => (await budgetClient.get<PriceTable[]>('/price-tables')).data,
    staleTime: 5 * 60_000,
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) => budgetClient.delete(`/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-items', id] })
      qc.invalidateQueries({ queryKey: ['budget', id] })
      toast.success('Item removido')
    },
    onError: () => toast.error('Erro ao remover item'),
  })

  const updateBudget = useMutation({
    mutationFn: (data: Partial<Budget>) => budgetClient.patch(`/budgets/${id}`, data),
    onSuccess: () => { refetchBudget(); toast.success('Dados salvos') },
    onError:   () => toast.error('Erro ao salvar'),
  })

  const addSinapiItem = useMutation({
    mutationFn: (data: { code: string; tableId: string; quantity: number; meta?: string; submeta?: string }) =>
      budgetClient.post(`/budgets/${id}/sinapi`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-items', id] })
      qc.invalidateQueries({ queryKey: ['budget', id] })
      toast.success('Item adicionado')
      closeAddItemModal()
    },
    onError: () => toast.error('Erro ao adicionar item'),
  })

  const addPendingQuotation = useMutation({
    mutationFn: (data: { description: string; unit: string; quantity: number; meta?: string; submeta?: string }) =>
      budgetClient.post(`/budgets/${id}/sinapi/pending-quotation`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-items', id] })
      qc.invalidateQueries({ queryKey: ['budget', id] })
      qc.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Item adicionado — enviado para cotação')
      closeAddItemModal()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Erro ao adicionar item'),
  })

  const addEmptyComposition = useMutation({
    mutationFn: (data: { description: string; unit: string; quantity: number; meta?: string; submeta?: string }) =>
      budgetClient.post(`/budgets/${id}/sinapi/empty-composition`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-items', id] })
      qc.invalidateQueries({ queryKey: ['budget', id] })
      toast.success('Composição criada — monte os insumos na tela de Composições')
      closeAddItemModal()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Erro ao criar composição'),
  })

  // ── Estado ────────────────────────────────────────────────
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [activeTab,     setActiveTab]     = useState<'catalogo' | 'cotacao' | 'composicao'>('catalogo')
  const [searchQ,       setSearchQ]       = useState('')
  const [tableId,       setTableId]       = useState('')
  const [qty,           setQty]           = useState(1)
  const [metaInput,     setMetaInput]     = useState('')
  const [submetaInput,  setSubmetaInput]  = useState('')
  const [selectedItem,  setSelectedItem]  = useState<CatalogItem | null>(null)
  const [collapsed,     setCollapsed]     = useState<Record<string, boolean>>({})
  const [editingMeta,   setEditingMeta]   = useState<string | null>(null)
  const [editMetaVal,   setEditMetaVal]   = useState('')
  const [editingSubmeta,setEditingSubmeta]= useState<string | null>(null)
  const [editSubmetaVal,setEditSubmetaVal]= useState('')
  const [companyOpen,   setCompanyOpen]   = useState(false)
  const [companyForm,   setCompanyForm]   = useState({
    companyName: '', companyCnpj: '', companyAddress: '',
    companyPhone: '', companyEmail: '', companyLogoUrl: '',
    engineerName: '', engineerCrea: '',
  })

  // Estado das abas Cotação/Composição
  const [pendingDesc, setPendingDesc] = useState('')
  const [pendingUnit, setPendingUnit] = useState('')
  const [pendingQty,  setPendingQty]  = useState(1)

  function closeAddItemModal() {
    setSearchOpen(false); setSearchQ(''); setSelectedItem(null)
    setQty(1); setPendingDesc(''); setPendingUnit(''); setPendingQty(1)
    setActiveTab('catalogo')
  }

  const { data: catalogData, isFetching: catalogLoading } = useQuery({
    queryKey: ['sinapi-search', searchQ, tableId],
    queryFn:  async () => {
      const p = new URLSearchParams({ q: searchQ, tableId, limit: '20' })
      return (await budgetClient.get<{ items: CatalogItem[] }>(`/sinapi/search?${p}`)).data
    },
    enabled:   searchQ.length >= 2 && !!tableId,
    staleTime: 60_000,
  })

  // Autocomplete de cotações existentes (aba Cotação)
  const { data: quotationMatches, isFetching: quotationSearchLoading } = useQuery({
    queryKey: ['quotation-search', pendingDesc],
    queryFn: async () => {
      const res = await budgetClient.get<{ quotations: QuotationSummary[] }>(`/quotations/search?q=${encodeURIComponent(pendingDesc)}`)
      return res.data.quotations
    },
    enabled: activeTab === 'cotacao' && pendingDesc.trim().length >= 2,
    staleTime: 15_000,
  })

  const items      = itemsData?.items ?? []
  const summary    = itemsData?.summary
  const metaGroups = groupByMeta(items)
  const statusCfg  = statusConfig[budget?.status ?? 'DRAFT']
  const existingMetas = Array.from(new Set(items.map(i => i.meta).filter((m): m is string => !!m)))
  const existingSubmetasForMeta = Array.from(new Set(
    items.filter(i => i.meta === metaInput).map(i => i.submeta).filter((s): s is string => !!s)
  ))

  function openCompanyForm() {
    setCompanyForm({
      companyName:    budget?.companyName    ?? '',
      companyCnpj:    budget?.companyCnpj    ?? '',
      companyAddress: budget?.companyAddress ?? '',
      companyPhone:   budget?.companyPhone   ?? '',
      companyEmail:   budget?.companyEmail   ?? '',
      companyLogoUrl: budget?.companyLogoUrl ?? '',
      engineerName:   budget?.engineerName   ?? '',
      engineerCrea:   budget?.engineerCrea   ?? '',
    })
    setCompanyOpen(true)
  }

  function handleRenameMeta(oldMeta: string, newMeta: string) {
    const affected = items.filter(i => (i.meta ?? '(SEM META)') === oldMeta)
    Promise.all(affected.map(i => budgetClient.patch(`/items/${i.id}`, { meta: newMeta.trim().toUpperCase() || null })))
      .then(() => { qc.invalidateQueries({ queryKey: ['budget-items', id] }); toast.success('Meta renomeada') })
    setEditingMeta(null)
  }

  function handleRenameSubmeta(meta: string, oldSubmeta: string, newSubmeta: string) {
    const affected = items.filter(i =>
      (i.meta ?? '(SEM META)') === meta && (i.submeta ?? '(SEM SUBMETA)') === oldSubmeta
    )
    Promise.all(affected.map(i => budgetClient.patch(`/items/${i.id}`, { submeta: newSubmeta.trim().toUpperCase() || null })))
      .then(() => { qc.invalidateQueries({ queryKey: ['budget-items', id] }); toast.success('Submeta renomeada') })
    setEditingSubmeta(null)
  }

  function handlePrint() { window.print() }

  let metaCounter = 0

  const tabs = [
    { key: 'catalogo'   as const, label: 'Catálogo',   icon: Package },
    { key: 'cotacao'    as const, label: 'Cotação',     icon: Banknote },
    { key: 'composicao' as const, label: 'Composição',  icon: GitBranch },
  ]

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-area { display: block !important; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between no-print">
          <div className="space-y-1">
            {budget?.projectId ? (
              <Link href={`/projetos/${budget.projectId}`}
                className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={12} /> {budget.project.name}
              </Link>
            ) : (
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground/50">
                <ArrowLeft size={12} /> Carregando...
              </span>
            )}
            <h1 className="text-[17px] font-medium text-foreground">{budget?.title}</h1>
            <div className="flex items-center gap-2">
              {statusCfg && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCfg.class}`}>
                  {statusCfg.label}
                </span>
              )}
              <span className="text-[12px] text-muted-foreground font-mono">v{budget?.version}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCompanyForm}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
              <Building2 size={14} /> Empresa
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
              <Printer size={14} /> Imprimir
            </button>
            <button
              onClick={() => budget && exportToExcel(budget, items, summary?.totalCost ?? 0)}
              className="flex items-center gap-1.5 rounded-md border border-emerald-600/40 text-emerald-700 px-3 py-1.5 text-[13px] hover:bg-emerald-600/5 transition-colors">
              <FileSpreadsheet size={14} /> Exportar Excel
            </button>
            <button onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700 transition-colors">
              <Plus size={14} /> Adicionar Item
            </button>
          </div>
        </div>

        {/* Área de impressão */}
        <div id="print-area">
          {(budget?.companyName || budget?.engineerName) && (
            <div className="border border-border rounded-lg overflow-hidden mb-4 bg-background">
              <div className="flex items-stretch border-b border-border">
                {budget.companyLogoUrl ? (
                  <div className="flex items-center justify-center px-6 py-4 border-r border-border bg-muted/20 min-w-[100px]">
                    <img src={budget.companyLogoUrl} alt="Logo" className="h-14 w-auto object-contain" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center px-6 py-4 border-r border-border min-w-[80px]">
                    <Building2 size={28} className="text-muted-foreground/25" />
                  </div>
                )}
                <div className="flex-1 px-5 py-4">
                  {budget.companyName && (
                    <p className="text-[15px] font-bold text-foreground uppercase tracking-wide leading-tight">{budget.companyName}</p>
                  )}
                  {budget.companyCnpj && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">CNPJ: {budget.companyCnpj}</p>
                  )}
                  {budget.companyAddress && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{budget.companyAddress}</p>
                  )}
                  <div className="flex gap-4 mt-1">
                    {budget.companyPhone && (
                      <p className="text-[11px] text-muted-foreground">Tel: {budget.companyPhone}</p>
                    )}
                    {budget.companyEmail && (
                      <p className="text-[11px] text-muted-foreground">{budget.companyEmail}</p>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4 border-l border-border bg-muted/10 text-right min-w-[200px] flex flex-col justify-center">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Orçamento</p>
                  <p className="text-[15px] font-bold text-foreground leading-tight">{budget.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Versão {budget.version}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-5 py-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Obra / Projeto</p>
                  <p className="text-[13px] font-medium text-foreground">{budget.project?.name}</p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Engenheiro Responsável</p>
                  <p className="text-[13px] font-medium text-foreground">{budget.engineerName ?? '—'}</p>
                  {budget.engineerCrea && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{budget.engineerCrea}</p>
                  )}
                </div>
                <div className="px-5 py-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data de Emissão</p>
                  <p className="text-[13px] font-medium text-foreground">
                    {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Planilha */}
          <div className="rounded-lg border border-border/50 bg-background overflow-hidden text-[12px]">
            <div className="grid grid-cols-[70px_100px_1fr_60px_90px_110px_110px_36px] bg-muted/60 border-b border-border">
              {['Nº', 'CÓDIGO', 'ESPECIFICAÇÃO DO INSUMO', 'UNID.', 'QTDE', 'PREÇO UNIT.', 'PREÇO TOTAL', ''].map(h => (
                <div key={h} className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</div>
              ))}
            </div>

            {itemsLoading && (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Carregando itens...
              </div>
            )}

            {!itemsLoading && items.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-[13px]">Nenhum item no orçamento</p>
                <p className="text-[12px] mt-1">Clique em "Adicionar Item" para buscar no catálogo, cotar ou montar uma composição</p>
              </div>
            )}

            {Object.entries(metaGroups).map(([meta, subgroups]) => {
              metaCounter++
              let submetaCounter = 0
              const metaNum    = String(metaCounter).padStart(2, '0')
              const metaTotal  = Object.values(subgroups).reduce((a, its) => a + subtotal(its), 0)
              const isCollapsed = collapsed[meta]

              return (
                <div key={meta}>
                  <div
                    className="grid grid-cols-[70px_100px_1fr_60px_90px_110px_110px_36px] bg-blue-50 dark:bg-blue-950/30 border-b border-border/50 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors group/meta"
                    onClick={() => setCollapsed(prev => ({ ...prev, [meta]: !prev[meta] }))}
                  >
                    <div className="px-3 py-2.5 flex items-center gap-1">
                      {isCollapsed ? <ChevronRight size={13} className="text-blue-600" /> : <ChevronDown size={13} className="text-blue-600" />}
                      <span className="font-bold text-blue-700 font-mono text-[11px]">{metaNum}</span>
                    </div>
                    <div className="px-3 py-2.5" />
                    <div className="px-3 py-2.5 flex items-center gap-2 col-span-4" onClick={e => e.stopPropagation()}>
                      {editingMeta === meta ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input autoFocus value={editMetaVal} onChange={e => setEditMetaVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameMeta(meta, editMetaVal); if (e.key === 'Escape') setEditingMeta(null) }}
                            className="flex-1 bg-white dark:bg-background border border-blue-400 rounded px-2 py-0.5 text-[12px] font-bold text-blue-700 uppercase outline-none" />
                          <button onClick={() => handleRenameMeta(meta, editMetaVal)}><Check size={13} className="text-blue-600" /></button>
                          <button onClick={() => setEditingMeta(null)}><X size={13} className="text-muted-foreground" /></button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-blue-700 uppercase tracking-wide">{meta}</span>
                          <button onClick={() => { setEditingMeta(meta); setEditMetaVal(meta) }}
                            className="opacity-0 group-hover/meta:opacity-100 text-blue-400 hover:text-blue-600 transition-opacity no-print">
                            <Pencil size={11} />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="px-3 py-2.5 font-bold text-blue-700 text-right font-mono">
                      {isCollapsed ? formatBRL(metaTotal) : ''}
                    </div>
                    <div />
                  </div>

                  {!isCollapsed && Object.entries(subgroups).map(([submeta, subItems]) => {
                    submetaCounter++
                    let subitemCounter = 0
                    const submetaNum  = `${metaNum}.${String(submetaCounter).padStart(2, '0')}`
                    const hasSubmeta  = submeta !== '(SEM SUBMETA)'
                    const submetaKey  = `${meta}__${submeta}`

                    return (
                      <div key={submeta}>
                        {hasSubmeta && (
                          <div className="grid grid-cols-[70px_100px_1fr_60px_90px_110px_110px_36px] bg-muted/20 border-b border-border/30 group/sub">
                            <div className="px-3 py-2 flex items-center">
                              <span className="font-semibold text-foreground font-mono text-[11px] ml-4">{submetaNum}</span>
                            </div>
                            <div className="px-3 py-2" />
                            <div className="px-3 py-2 flex items-center gap-2 col-span-4">
                              {editingSubmeta === submetaKey ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <input autoFocus value={editSubmetaVal} onChange={e => setEditSubmetaVal(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmeta(meta, submeta, editSubmetaVal); if (e.key === 'Escape') setEditingSubmeta(null) }}
                                    className="flex-1 bg-background border border-border rounded px-2 py-0.5 text-[12px] font-semibold uppercase outline-none focus:border-emerald-600" />
                                  <button onClick={() => handleRenameSubmeta(meta, submeta, editSubmetaVal)}><Check size={13} className="text-emerald-600" /></button>
                                  <button onClick={() => setEditingSubmeta(null)}><X size={13} className="text-muted-foreground" /></button>
                                </div>
                              ) : (
                                <>
                                  <span className="font-semibold text-foreground">{submeta}</span>
                                  <button onClick={() => { setEditingSubmeta(submetaKey); setEditSubmetaVal(submeta) }}
                                    className="opacity-0 group-hover/sub:opacity-100 text-muted-foreground hover:text-foreground transition-opacity no-print">
                                    <Pencil size={11} />
                                  </button>
                                </>
                              )}
                            </div>
                            <div /><div />
                          </div>
                        )}

                        {subItems.map(item => {
                          subitemCounter++
                          const itemNum   = hasSubmeta
                            ? `${submetaNum}.${String(subitemCounter).padStart(2, '0')}`
                            : `${metaNum}.${String(subitemCounter).padStart(2, '0')}`
                          const codeMatch = item.notes?.match(/\[(SINAPI|SEINFRA|SICRO|PROPRIA)\s+(\S+)\]/)
                          const code      = codeMatch?.[2] ?? '—'
                          const source    = codeMatch?.[1] ?? ''
                          const isPending = item.notes?.includes('[PENDENTE-')

                          return (
                            <div key={item.id}
                              className={`grid grid-cols-[70px_100px_1fr_60px_90px_110px_110px_36px] border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors group ${isPending ? 'bg-yellow-500/5' : ''}`}>
                              <div className="px-3 py-2.5 text-muted-foreground font-mono text-[11px] pl-6">{itemNum}</div>
                              <div className="px-3 py-2.5 font-mono text-emerald-600 text-[11px]">
                                {code}{source && <span className="ml-1 text-[9px] text-muted-foreground">{source}</span>}
                              </div>
                              <div className="px-3 py-2.5 text-foreground leading-snug">
                                {item.description}
                                {isPending && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-700 font-medium">
                                    <AlertCircle size={10} /> Aguardando preço
                                  </span>
                                )}
                              </div>
                              <div className="px-3 py-2.5 text-muted-foreground text-center">{item.unit}</div>
                              <div className="px-3 py-2.5 text-muted-foreground text-right font-mono">{parseFloat(item.quantity).toLocaleString('pt-BR')}</div>
                              <div className="px-3 py-2.5 text-muted-foreground text-right font-mono">{formatBRL(item.unitPrice)}</div>
                              <div className="px-3 py-2.5 font-semibold text-foreground text-right font-mono">{formatBRL(item.totalPrice)}</div>
                              <div className="px-3 py-2.5 flex items-center justify-center no-print">
                                <button onClick={() => removeItem.mutate(item.id)}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          )
                        })}

                        {hasSubmeta && (
                          <div className="grid grid-cols-[70px_100px_1fr_60px_90px_110px_110px_36px] border-b border-border/30 bg-muted/10">
                            <div className="col-span-6 px-3 py-2 text-[11px] font-medium text-muted-foreground text-right uppercase tracking-wider">Total {submeta}</div>
                            <div className="px-3 py-2 text-[12px] font-semibold text-foreground text-right font-mono">{formatBRL(subtotal(subItems))}</div>
                            <div />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  <div className="grid grid-cols-[70px_100px_1fr_60px_90px_110px_110px_36px] border-b border-border bg-blue-50 dark:bg-blue-950/20">
                    <div className="col-span-6 px-3 py-2.5 text-[11px] font-bold text-blue-700 text-right uppercase tracking-wider">Total {metaNum} — {meta}</div>
                    <div className="px-3 py-2.5 text-[13px] font-bold text-blue-700 text-right font-mono">{formatBRL(metaTotal)}</div>
                    <div />
                  </div>
                </div>
              )
            })}

            {items.length > 0 && summary && (
              <div className="grid grid-cols-[70px_100px_1fr_60px_90px_110px_110px_36px] bg-emerald-50 dark:bg-emerald-950/20 border-t-2 border-emerald-600/30">
                <div className="col-span-6 px-3 py-3.5 text-[12px] font-bold text-emerald-700 text-right uppercase tracking-wider">Total Geral do Orçamento</div>
                <div className="px-3 py-3.5 text-[15px] font-bold text-emerald-700 text-right font-mono">{formatBRL(summary.totalCost)}</div>
                <div />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal dados da empresa */}
      {companyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold flex items-center gap-2"><Building2 size={15} /> Dados da Empresa</h2>
              <button onClick={() => setCompanyOpen(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Nome da Empresa</label>
                  <input value={companyForm.companyName} onChange={e => setCompanyForm(p => ({ ...p, companyName: e.target.value }))}
                    placeholder="OrcaBuild Engenharia Ltda"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">CNPJ</label>
                  <input value={companyForm.companyCnpj} onChange={e => setCompanyForm(p => ({ ...p, companyCnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Endereço</label>
                <input value={companyForm.companyAddress} onChange={e => setCompanyForm(p => ({ ...p, companyAddress: e.target.value }))}
                  placeholder="Rua Exemplo, 123 — Fortaleza, CE"
                  className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Telefone</label>
                  <input value={companyForm.companyPhone} onChange={e => setCompanyForm(p => ({ ...p, companyPhone: e.target.value }))}
                    placeholder="(85) 99999-9999"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">E-mail</label>
                  <input value={companyForm.companyEmail} onChange={e => setCompanyForm(p => ({ ...p, companyEmail: e.target.value }))}
                    placeholder="contato@empresa.com"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Logo da Empresa</label>
                {companyForm.companyLogoUrl && (
                  <div className="flex items-center gap-3 mb-2">
                    <img src={companyForm.companyLogoUrl} alt="Logo" className="h-10 w-auto object-contain border border-border rounded p-1" />
                    <button
                      onClick={() => setCompanyForm(p => ({ ...p, companyLogoUrl: '' }))}
                      className="text-[11px] text-destructive hover:underline">
                      Remover
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      setCompanyForm(p => ({ ...p, companyLogoUrl: reader.result as string }))
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] text-muted-foreground outline-none focus:border-emerald-600 file:mr-3 file:rounded file:border-0 file:bg-emerald-600 file:px-2 file:py-0.5 file:text-[11px] file:font-medium file:text-white"
                />
                <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG ou SVG — a imagem é salva junto com o orçamento</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Engenheiro Responsável</label>
                  <input value={companyForm.engineerName} onChange={e => setCompanyForm(p => ({ ...p, engineerName: e.target.value }))}
                    placeholder="Eng. João Silva"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">CREA</label>
                  <input value={companyForm.engineerCrea} onChange={e => setCompanyForm(p => ({ ...p, engineerCrea: e.target.value }))}
                    placeholder="CREA-CE 12345-D"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setCompanyOpen(false)}
                  className="flex-1 rounded-md border border-border px-4 py-2 text-[13px] text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => { updateBudget.mutate(companyForm); setCompanyOpen(false) }}
                  disabled={updateBudget.isPending}
                  className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {updateBudget.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Item — busca unificada */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
              <h2 className="text-[14px] font-semibold">Adicionar Item ao Orçamento</h2>
              <button onClick={closeAddItemModal}>
                <X size={16} className="text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">

              {/* Meta/Submeta */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Meta (opcional)</label>
                  <input value={metaInput} onChange={e => setMetaInput(e.target.value)} placeholder="Ex: FUNDAÇÕES"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600 uppercase transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Submeta (opcional)</label>
                  <input value={submetaInput} onChange={e => setSubmetaInput(e.target.value)} placeholder="Ex: BALDRAME"
                    className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600 uppercase transition-colors" />
                </div>
              </div>

              {existingMetas.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Metas já usadas neste orçamento:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {existingMetas.map(m => (
                      <button key={m} onClick={() => setMetaInput(m)}
                        className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                          metaInput === m
                            ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 font-medium'
                            : 'border-border text-muted-foreground hover:border-emerald-600/50 hover:text-foreground'
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {existingSubmetasForMeta.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Submetas já usadas em "{metaInput || '...'}":</p>
                  <div className="flex flex-wrap gap-1.5">
                    {existingSubmetasForMeta.map(s => (
                      <button key={s} onClick={() => setSubmetaInput(s)}
                        className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                          submetaInput === s
                            ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 font-medium'
                            : 'border-border text-muted-foreground hover:border-emerald-600/50 hover:text-foreground'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border/50 pt-3" />

              {/* Tabela de preços */}
              <select value={tableId} onChange={e => setTableId(e.target.value)}
                className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-2 text-[13px] outline-none focus:border-emerald-600 transition-colors">
                <option value="">Selecione a tabela de preços</option>
                {tables?.map(t => <option key={t.id} value={t.id}>{t.source} — {t.reference} {t.type ? `(${t.type})` : ''} {t.state}</option>)}
              </select>

              {/* Busca unificada */}
              <div className="flex items-center gap-2 rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-2 focus-within:border-emerald-600 transition-colors">
                <Search size={14} className="text-muted-foreground flex-shrink-0" />
                <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setSelectedItem(null) }}
                  placeholder="Buscar por código ou descrição em todas as tabelas…"
                  className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                  disabled={!tableId} autoFocus />
                {catalogLoading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
              </div>

              {/* Resultados */}
              {catalogData?.items && catalogData.items.length > 0 && (
                <div className="rounded-md border border-border overflow-hidden max-h-52 overflow-y-auto">
                  {catalogData.items.map(item => {
                    const isPending = !item.basePrice || parseFloat(item.basePrice) === 0
                    const isCot = item.code.startsWith('COT')
                    const isCp  = item.code.startsWith('CP')
                    return (
                      <button key={item.id} onClick={() => setSelectedItem(item)}
                        className={`w-full text-left px-3 py-2.5 border-b border-border/30 last:border-0 transition-colors ${selectedItem?.id === item.id ? 'bg-muted border-l-2 border-l-emerald-600' : 'hover:bg-muted/50'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[11px] flex-shrink-0 ${isCot ? 'text-yellow-600' : isCp ? 'text-purple-600' : 'text-emerald-600'}`}>
                            {item.code}
                          </span>
                          {(isCot || isCp) && (
                            <span className={`text-[9px] px-1 py-0.5 rounded font-medium flex-shrink-0 ${isCot ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                              {isCot ? 'COTAÇÃO' : 'COMPOSIÇÃO'}
                            </span>
                          )}
                          <span className="text-[12px] text-foreground truncate flex-1">{item.description}</span>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">{item.unit}</span>
                          <span className={`text-[12px] font-mono font-semibold flex-shrink-0 ${isPending ? 'text-yellow-600' : 'text-foreground'}`}>
                            {isPending ? 'Sem preço' : formatBRL(item.basePrice)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Nenhum resultado — botões para criar */}
              {searchQ.length >= 2 && tableId && !catalogLoading && catalogData?.items.length === 0 && (
                <div className="rounded-md border border-border/50 bg-muted/20 p-4 space-y-3">
                  <p className="text-[13px] text-muted-foreground text-center">
                    Nenhum item encontrado para <strong>"{searchQ}"</strong>
                  </p>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Você pode criar um item pendente de cotação ou uma composição própria:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setPendingDesc(searchQ); setActiveTab('cotacao') }}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-yellow-500/40 bg-yellow-500/5 px-3 py-2 text-[12px] font-medium text-yellow-700 hover:bg-yellow-500/10 transition-colors"
                    >
                      <Banknote size={14} /> Criar item para Cotação
                    </button>
                    <button
                      onClick={() => { setPendingDesc(searchQ); setActiveTab('composicao') }}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-purple-500/40 bg-purple-500/5 px-3 py-2 text-[12px] font-medium text-purple-700 hover:bg-purple-500/10 transition-colors"
                    >
                      <GitBranch size={14} /> Criar Composição Própria
                    </button>
                  </div>
                </div>
              )}

              {/* Item selecionado — quantidade */}
              {selectedItem && (
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Item selecionado</p>
                    <p className="text-[13px] font-medium text-foreground">{selectedItem.description}</p>
                    <p className="text-[12px] text-muted-foreground font-mono mt-0.5">
                      {selectedItem.code} · {selectedItem.unit} ·{' '}
                      {selectedItem.basePrice && parseFloat(selectedItem.basePrice) > 0
                        ? formatBRL(selectedItem.basePrice)
                        : <span className="text-yellow-600">Aguardando preço</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground block mb-1">Quantidade</label>
                      <input type="number" min="0.001" step="0.001" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 1)}
                        className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] font-mono outline-none focus:border-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-muted-foreground mb-1">Total estimado</p>
                      <p className="text-[14px] font-bold text-emerald-600 font-mono">
                        {selectedItem.basePrice && parseFloat(selectedItem.basePrice) > 0
                          ? formatBRL(parseFloat(selectedItem.basePrice) * qty)
                          : <span className="text-yellow-600 text-[12px]">R$ 0,00 (sem preço)</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => addSinapiItem.mutate({
                      code: selectedItem.code,
                      tableId,
                      quantity: qty,
                      meta: metaInput.trim().toUpperCase() || undefined,
                      submeta: submetaInput.trim().toUpperCase() || undefined,
                    })}
                    disabled={addSinapiItem.isPending}
                    className="w-full rounded-md bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {addSinapiItem.isPending
                      ? <><Loader2 size={14} className="animate-spin" /> Adicionando...</>
                      : <><Plus size={14} /> Adicionar ao Orçamento</>}
                  </button>
                </div>
              )}

              {/* Mini formulário — Criar Cotação */}
              {activeTab === 'cotacao' && (
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-3">
                  <p className="text-[12px] font-medium text-yellow-700 flex items-center gap-1.5">
                    <Banknote size={14} /> Criar item pendente de Cotação
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Entra no orçamento com R$0,00 e aparece na tela de Cotações para ser precificado.
                  </p>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Descrição</label>
                    <input value={pendingDesc} onChange={e => setPendingDesc(e.target.value)}
                      placeholder="Ex: Tubo PEAD PE100 PN16 DN450"
                      className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Unidade</label>
                      <input value={pendingUnit} onChange={e => setPendingUnit(e.target.value.toUpperCase())}
                        placeholder="M, UN, KG..."
                        className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600 uppercase" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Quantidade</label>
                      <input type="number" min="0.001" step="0.001" value={pendingQty}
                        onChange={e => setPendingQty(parseFloat(e.target.value) || 1)}
                        className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] font-mono outline-none focus:border-emerald-600" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveTab('catalogo')}
                      className="flex-1 rounded-md border border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/50 transition-colors">
                      Voltar
                    </button>
                    <button
                      onClick={() => addPendingQuotation.mutate({
                        description: pendingDesc,
                        unit: pendingUnit.trim().toUpperCase(),
                        quantity: pendingQty,
                        meta: metaInput.trim().toUpperCase() || undefined,
                        submeta: submetaInput.trim().toUpperCase() || undefined,
                      })}
                      disabled={!pendingDesc.trim() || !pendingUnit.trim() || addPendingQuotation.isPending}
                      className="flex-1 rounded-md bg-yellow-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-yellow-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                      {addPendingQuotation.isPending
                        ? <><Loader2 size={13} className="animate-spin" /> Adicionando...</>
                        : <><Banknote size={13} /> Adicionar para Cotação</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Mini formulário — Criar Composição */}
              {activeTab === 'composicao' && (
                <div className="rounded-md border border-purple-500/30 bg-purple-500/5 p-3 space-y-3">
                  <p className="text-[12px] font-medium text-purple-700 flex items-center gap-1.5">
                    <GitBranch size={14} /> Criar Composição Própria
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Entra no orçamento com R$0,00. Monte os insumos depois em <strong>Composições</strong>.
                  </p>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Descrição do serviço</label>
                    <input value={pendingDesc} onChange={e => setPendingDesc(e.target.value)}
                      placeholder="Ex: Instalação de tubo PVC DN100"
                      className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Unidade</label>
                      <input value={pendingUnit} onChange={e => setPendingUnit(e.target.value.toUpperCase())}
                        placeholder="M, UN, M²..."
                        className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] outline-none focus:border-emerald-600 uppercase" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Quantidade</label>
                      <input type="number" min="0.001" step="0.001" value={pendingQty}
                        onChange={e => setPendingQty(parseFloat(e.target.value) || 1)}
                        className="w-full rounded-md border border-border bg-white dark:bg-zinc-800 px-3 py-1.5 text-[13px] font-mono outline-none focus:border-emerald-600" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveTab('catalogo')}
                      className="flex-1 rounded-md border border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/50 transition-colors">
                      Voltar
                    </button>
                    <button
                      onClick={() => addEmptyComposition.mutate({
                        description: pendingDesc,
                        unit: pendingUnit.trim().toUpperCase(),
                        quantity: pendingQty,
                        meta: metaInput.trim().toUpperCase() || undefined,
                        submeta: submetaInput.trim().toUpperCase() || undefined,
                      })}
                      disabled={!pendingDesc.trim() || !pendingUnit.trim() || addEmptyComposition.isPending}
                      className="flex-1 rounded-md bg-purple-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                      {addEmptyComposition.isPending
                        ? <><Loader2 size={13} className="animate-spin" /> Criando...</>
                        : <><GitBranch size={13} /> Criar e Adicionar</>}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}