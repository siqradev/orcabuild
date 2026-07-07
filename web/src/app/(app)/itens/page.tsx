'use client'

import { useState }           from 'react'
import { Search }             from 'lucide-react'
import { usePriceTables }     from '@/features/catalog/hooks/usePriceTables'
import { useCatalogSearch }   from '@/features/catalog/hooks/useCatalogSearch'
import { formatCurrency }     from '@/lib/formatters'

export default function ItensPage() {
  const [q, setQ]           = useState('')
  const [tableId, setTableId] = useState('')
  const [tipo, setTipo]     = useState<'INSUMO' | 'COMPOSICAO' | ''>('')

  const { data: tables, isLoading: tablesLoading } = usePriceTables()

  const { data, isLoading, isError } = useCatalogSearch({
    q,
    tableId,
    type:  tipo || undefined,
    limit: 50,
  })

  const items = data?.items ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-medium text-foreground">Itens</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {data ? `${items.length} itens encontrados` : 'Insumos e composições do catálogo'}
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* Select de tabela — obrigatório */}
        <select
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          className="rounded-md border border-border/50 bg-white dark:bg-zinc-800 px-3 py-2 text-[13px] text-foreground outline-none min-w-[200px]"
          disabled={tablesLoading}
        >
          <option value="">
            {tablesLoading ? 'Carregando tabelas...' : 'Selecione uma tabela'}
          </option>
          {tables?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.source} — {t.reference} ({t.type}) {t.state}
            </option>
          ))}
        </select>

        {/* Busca textual */}
        <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-md border border-border/50 bg-white dark:bg-zinc-800 px-3 py-2">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código ou descrição… (mín. 2 caracteres)"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            disabled={!tableId}
          />
        </div>

        {/* Tipo */}
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as 'INSUMO' | 'COMPOSICAO' | '')}
          className="rounded-md border border-border/50 bg-white dark:bg-zinc-800 px-3 py-2 text-[13px] text-foreground outline-none"
          disabled={!tableId}
        >
          <option value="">Todos os tipos</option>
          <option value="INSUMO">Insumo</option>
          <option value="COMPOSICAO">Composição</option>
        </select>
      </div>

      {/* Aviso se tabela não selecionada */}
      {!tableId && (
        <div className="rounded-lg border border-border/50 bg-background px-4 py-12 text-center text-[13px] text-muted-foreground">
          Selecione uma tabela de preços para buscar itens
        </div>
      )}

      {/* Tabela de resultados */}
      {tableId && (
        <div className="rounded-lg border border-border/50 bg-background overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Un.</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Preço</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

              {isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Erro ao buscar itens — verifique se a ETL API está rodando
                  </td>
                </tr>
              )}

              {!isLoading && !isError && q.length < 2 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Digite pelo menos 2 caracteres para buscar
                  </td>
                </tr>
              )}

              {!isLoading && !isError && q.length >= 2 && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum item encontrado para "{q}"
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] text-emerald-600">{item.code}</td>
                  <td className="px-4 py-3 text-foreground max-w-md truncate">{item.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      item.type === 'INSUMO'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-purple-500/10 text-purple-600'
                    }`}>
                      {item.type === 'INSUMO' ? 'Insumo' : 'Composição'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {formatCurrency(parseFloat(item.basePrice))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
