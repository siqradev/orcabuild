import { z } from 'zod'

export const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT:    ['REVIEW'],
  REVIEW:   ['APPROVED', 'REJECTED'],
  REJECTED: ['DRAFT'],
  APPROVED: ['ARCHIVED'],
  ARCHIVED: [],
}

export const createBudgetSchema = z.object({
  title:       z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  currency:    z.string().length(3).toUpperCase().default('BRL'),
})

export const updateBudgetSchema = z.object({
  title:          z.string().min(3).max(200).optional(),
  description:    z.string().max(2000).optional(),
  currency:       z.string().length(3).toUpperCase().optional(),
  companyName:    z.string().max(200).optional(),
  companyCnpj:    z.string().max(20).optional(),
  companyAddress: z.string().max(300).optional(),
  companyPhone:   z.string().max(30).optional(),
  companyEmail:   z.string().email().max(150).optional(),
  companyLogoUrl: z.string().url().max(2000).optional(),
  engineerName:   z.string().max(150).optional(),
  engineerCrea:   z.string().max(30).optional(),
})

export const updateBudgetStatusSchema = z.object({
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']),
})

export const budgetIdSchema = z.object({
  id: z.string().uuid('ID do orçamento inválido'),
})

export const projectIdSchema = z.object({
  projectId: z.string().uuid('ID do projeto inválido'),
})

export const listBudgetsSchema = z.object({
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateBudgetInput       = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput       = z.infer<typeof updateBudgetSchema>
export type UpdateBudgetStatusInput = z.infer<typeof updateBudgetStatusSchema>
export type ListBudgetsQuery        = z.infer<typeof listBudgetsSchema>