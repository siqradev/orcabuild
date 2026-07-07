import { budgetClient }                          from './budgetClient'
import type { Project, CreateProjectInput }      from '@/types/budget.types'

interface ProjectsResponse {
  data:  Project[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const projectsService = {
  async list(): Promise<Project[]> {
    const res = await budgetClient.get<ProjectsResponse>('/projects')
    return res.data.data
  },

  async getById(id: string): Promise<Project> {
    const res = await budgetClient.get<Project>(`/projects/${id}`)
    return res.data
  },

  async create(data: CreateProjectInput): Promise<Project> {
    const res = await budgetClient.post<Project>('/projects', data)
    return res.data
  },

  async update(id: string, data: Partial<CreateProjectInput>): Promise<Project> {
    const res = await budgetClient.put<Project>(`/projects/${id}`, data)
    return res.data
  },

  async remove(id: string): Promise<void> {
    await budgetClient.delete(`/projects/${id}`)
  },
}
