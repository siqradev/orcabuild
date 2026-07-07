import { z } from 'zod'

export const itemSearchSchema = z.object({
  q: z
    .string()
    .min(2, 'Digite pelo menos 2 caracteres'),
  source: z
    .enum(['SINAPI', 'SEINFRA', 'SICRO', 'EMBASA', 'CPOS', 'ORSE'])
    .optional(),
  tableType: z
    .enum(['ONERADA', 'DESONERADA'])
    .optional(),
  state: z
    .string()
    .length(2)
    .optional(),
  year: z.coerce
    .number()
    .int()
    .optional(),
  tableId: z
    .string()
    .uuid()
    .optional(),
})

export type ItemSearchInput = z.infer<typeof itemSearchSchema>
