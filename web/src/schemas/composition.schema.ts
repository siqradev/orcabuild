import { z } from 'zod'

export const resolveCompositionSchema = z.object({
  code: z
    .string({ required_error: 'Código da composição obrigatório' })
    .min(1, 'Código da composição obrigatório'),
  tableId: z
    .string({ required_error: 'Tabela obrigatória' })
    .uuid('tableId inválido'),
  qty: z.coerce
    .number()
    .positive('Quantidade deve ser positiva')
    .default(1),
})

export type ResolveCompositionInput = z.infer<typeof resolveCompositionSchema>
