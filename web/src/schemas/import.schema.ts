import { z } from 'zod'

const currentYear = new Date().getFullYear()

export const sinapiImportSchema = z.object({
  state: z
    .string()
    .length(2, 'UF deve ter 2 letras')
    .transform((v) => v.toUpperCase())
    .default('CE'),
  month: z.coerce
    .number({ required_error: 'Mês obrigatório' })
    .int()
    .min(1, 'Mês inválido')
    .max(12, 'Mês inválido'),
  year: z.coerce
    .number({ required_error: 'Ano obrigatório' })
    .int()
    .min(2020, 'Ano inválido')
    .max(currentYear, 'Ano no futuro'),
  filePath: z.string().optional(),
})

export type SinapiImportInput = z.infer<typeof sinapiImportSchema>

export const seinfraImportSchema = z.object({
  version: z.enum(['028', '028.1'], {
    required_error: 'Versão obrigatória',
  }),
  insumos: z
    .string()
    .min(1, 'Caminho do arquivo de insumos obrigatório'),
  planos: z
    .string()
    .min(1, 'Caminho do arquivo de planos obrigatório'),
  composicoes: z.string().optional(),
})

export type SeinfraImportInput = z.infer<typeof seinfraImportSchema>
