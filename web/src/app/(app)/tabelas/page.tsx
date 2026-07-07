'use client'

import { usePriceTables } from '@/features/tables/hooks/useTables'
import { formatDate } from '@/lib/formatters'

const sourceColors: Record<string, string> = {
  SINAPI:  'border-emerald-500 text-emerald-600',
  SEINFRA: 'border-blue-500 text-blue-600',
  SICRO:   'border-amber-500 text-amber-600',
  EMBASA:  'border-purple-500 text-purple-600',
  CPOS:    'border-pink-500 text-pink-600',
  ORSE:    'border-orange-500 text-orange-600',
}

export default function TabelasPage() {
  const { data: tables, isLoading } = usePriceTables()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-medium text-foreground">Tabelas</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {tables && tables.length > 0
            ? `${tables.length} tabelas de preços importadas`
            : 'Tabelas de preços — SINAPI e SEINFRA-CE'}
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-background p-4 space-y-3">
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
              <div className="h-6 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && tables?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <p className="text-[13px]">Nenhuma tabela encontrada — inicie uma importação primeiro.</p>
        </div>
      )}

      {!isLoading && tables && tables.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => {
            const colorClass = sourceColors[table.source] ?? 'border-border text-muted-foreground'
            const borderColor = colorClass.split(' ')[0]
            const textColor   = colorClass.split(' ')[1]

            const reference = table.source === 'SEINFRA'
              ? `Versão ${table.version}`
              : `${String(table.month ?? '').padStart(2, '0')}/${table.year}`

            return (
              <div
                key={table.id}
                className={`rounded-lg border-l-2 border border-border/50 bg-background p-4 ${borderColor}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[12px] font-semibold ${textColor}`}>
                    {table.source}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Ativa
                  </span>
                </div>

                <p className="text-[15px] font-medium text-foreground mb-1">
                  {reference} — {table.state}
                </p>

                {table.type && (
                  <p className="text-[11px] text-muted-foreground mb-3">{table.type}</p>
                )}

                <div className="space-y-1.5 pt-3 border-t border-border/50">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">Referência</span>
                    <span className="text-foreground font-mono">{table.reference}</span>
                  </div>
                  {table.description && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground">Descrição</span>
                      <span className="text-foreground text-right max-w-[180px] truncate">{table.description}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}