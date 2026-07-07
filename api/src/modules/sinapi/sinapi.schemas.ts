import { z } from "zod";

export const searchCatalogSchema = z.object({
  q:       z.string().min(2, "Busca deve ter no mínimo 2 caracteres"),
  tableId: z.string().uuid("tableId inválido"),
  type:    z.enum(["INSUMO", "COMPOSICAO"]).optional(),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
});

export const addCatalogItemSchema = z.object({
  code:     z.string().min(1, "Código é obrigatório"),
  tableId:  z.string().uuid("tableId inválido"),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  meta:     z.string().max(150).optional(),
  submeta:  z.string().max(150).optional(),
  category: z.string().max(100).optional(),
  notes:    z.string().max(2000).optional(),
});

export const addManyCatalogItemsSchema = z.object({
  tableId: z.string().uuid("tableId inválido"),
  items: z.array(z.object({
    code:     z.string().min(1),
    quantity: z.number().positive(),
    meta:     z.string().max(150).optional(),
    submeta:  z.string().max(150).optional(),
    category: z.string().max(100).optional(),
  })).min(1).max(50),
});

export const budgetIdParamSchema = z.object({
  budgetId: z.string().uuid("ID do orçamento inválido"),
});

export const createPendingQuotationItemSchema = z.object({
  description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres").max(300),
  unit:        z.string().min(1, "Unidade é obrigatória").max(20),
  quantity:    z.number().positive("Quantidade deve ser maior que zero"),
  meta:        z.string().max(150).optional(),
  submeta:     z.string().max(150).optional(),
});

export const createEmptyCompositionItemSchema = z.object({
  description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres").max(300),
  unit:        z.string().min(1, "Unidade é obrigatória").max(20),
  quantity:    z.number().positive("Quantidade deve ser maior que zero"),
  meta:        z.string().max(150).optional(),
  submeta:     z.string().max(150).optional(),
});

export type SearchCatalogQuery               = z.infer<typeof searchCatalogSchema>;
export type AddCatalogItemInput              = z.infer<typeof addCatalogItemSchema>;
export type AddManyCatalogItemsInput         = z.infer<typeof addManyCatalogItemsSchema>;
export type CreatePendingQuotationItemInput  = z.infer<typeof createPendingQuotationItemSchema>;
export type CreateEmptyCompositionItemInput  = z.infer<typeof createEmptyCompositionItemSchema>;