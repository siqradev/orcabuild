'use client'

import { useState }           from 'react'
import { useProjects, useCreateProject, useDeleteProject } from '@/features/projects/hooks/useProjects'
import { Button }             from '@/components/ui/button'
import { Input }              from '@/components/ui/input'
import { Card, CardContent }  from '@/components/ui/card'
import { Badge }              from '@/components/ui/badge'
import { Skeleton }           from '@/components/ui/skeleton'
import { Plus, Folder, Trash2, ArrowRight } from 'lucide-react'
import Link                   from 'next/link'
import type { ProjectStatus } from '@/types/budget.types'

const statusLabel: Record<ProjectStatus, string> = {
  ACTIVE:    'Ativo',
  ARCHIVED:  'Arquivado',
  COMPLETED: 'Concluído',
}

const statusVariant: Record<ProjectStatus, 'default' | 'secondary' | 'outline'> = {
  ACTIVE:    'default',
  ARCHIVED:  'outline',
  COMPLETED: 'secondary',
}

export default function ProjetosPage() {
  const { data: projects, isLoading } = useProjects()
  const createProject  = useCreateProject()
  const deleteProject  = useDeleteProject()
  const [name, setName]    = useState('')
  const [open, setOpen]    = useState(false)

  function handleCreate() {
    if (!name.trim()) return
    createProject.mutate({ name: name.trim() }, {
      onSuccess: () => { setName(''); setOpen(false) },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus projetos de orçamento</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Projeto
        </Button>
      </div>

      {/* Formulário rápido */}
      {open && (
        <Card>
          <CardContent className="pt-4 flex gap-2">
            <Input
              placeholder="Nome do projeto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <Button onClick={handleCreate} disabled={createProject.isPending}>
              {createProject.isPending ? 'Criando...' : 'Criar'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !projects?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum projeto encontrado</p>
          <p className="text-sm">Crie seu primeiro projeto para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{project.name}</span>
                    <Badge variant={statusVariant[project.status]}>
                      {statusLabel[project.status]}
                    </Badge>
                  </div>
                  {project.location && (
                    <p className="text-sm text-muted-foreground">{project.location}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {project._count?.budgets ?? 0} orçamento(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteProject.mutate(project.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projetos/${project.id}`}>
                      Ver <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
