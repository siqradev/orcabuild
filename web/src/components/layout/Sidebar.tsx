'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CloudUpload,
  Table2,
  Package,
  GitBranch,
  ScrollText,
  Settings,
  FolderOpen,
  FileText,
  Banknote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
const navItems = [
  {
    section: 'Principal',
    items: [
      { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
      { label: 'Importações',  href: '/importacoes',  icon: CloudUpload },
    ],
  },
  {
    section: 'Orçamento',
    items: [
      { label: 'Projetos',     href: '/projetos',     icon: FolderOpen },
      { label: 'Orçamentos',   href: '/orcamentos',   icon: FileText },
      { label: 'Cotações',     href: '/cotacoes',     icon: Banknote },
    ],
  },
  {
    section: 'Catálogo',
    items: [
      { label: 'Tabelas',      href: '/tabelas',      icon: Table2 },
      { label: 'Itens',        href: '/itens',        icon: Package },
    ],
  },
  {
    section: 'Engenharia',
    items: [
      { label: 'Composições',  href: '/composicoes',  icon: GitBranch },
      { label: 'Logs ETL',     href: '/logs',         icon: ScrollText },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { label: 'Configurações', href: '/configuracoes', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-[200px] flex-shrink-0 flex-col border-r border-border/50 bg-background">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border/50 px-4 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round">
            <polygon points="8,2 14,6 14,10 8,14 2,10 2,6" />
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="6" x2="14" y2="10" />
            <line x1="14" y1="6" x2="2" y2="10" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-medium leading-none text-foreground">OrcaBuild</p>
          <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">Enterprise v2.4</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((group) => (
          <div key={group.section}>
            <p className="px-4 pb-1 pt-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
              {group.section}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-1.5 text-[13px] transition-colors',
                    active
                      ? 'border-r-2 border-emerald-600 bg-emerald-600/8 font-medium text-emerald-600'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex items-center gap-2.5 border-t border-border/50 px-4 py-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-[11px] font-medium text-emerald-600">
          EN
        </div>
        <div>
          <p className="text-[12px] font-medium leading-none text-foreground">Eng. Silva</p>
          <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">Admin</p>
        </div>
      </div>
    </aside>
  )
}
