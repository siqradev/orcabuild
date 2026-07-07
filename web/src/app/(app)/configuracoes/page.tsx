export const metadata = { title: 'Configurações' }

export default function ConfiguracoesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-medium text-foreground">Configurações</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Configurações do sistema
        </p>
      </div>
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-[13px] text-muted-foreground">
        Configurações em construção…
      </div>
    </div>
  )
}