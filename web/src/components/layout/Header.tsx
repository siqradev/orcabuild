'use client'

import { useState, useEffect } from 'react'
import { Search, Bell, Sun, Moon, HelpCircle } from 'lucide-react'
import { useTheme } from 'next-themes'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <header className="flex h-[52px] flex-shrink-0 items-center gap-3 border-b border-border/50 bg-background px-5">
      {/* Busca global */}
      <div className="flex flex-1 max-w-sm items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 transition-colors focus-within:border-border">
        <Search size={14} className="flex-shrink-0 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar itens, composições, tabelas…"
          className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
          ⌘K
        </kbd>
      </div>

      {/* Ações */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* Notificações */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
          <Bell size={15} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </button>

        {/* Toggle tema */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          {mounted
            ? theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />
            : <Sun size={15} />
          }
        </button>

        {/* Ajuda */}
        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  )
}