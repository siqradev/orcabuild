import { z } from "zod";

export const createBudgetItemSchema = z.object({
  description: z.string().min(3).max(300),
  unit:        z.string().min(1).max(20),
  quantity:    z.number().positive().multipleOf(0.001),
  unitPrice:   z.number().positive().multipleOf(0.01),
  meta:        z.string().max(150).optional(),
  submeta:     z.string().max(150).optional(),
  category:    z.string().max(100).optional(),
  notes:       z.string().max(2000).optional(),
  sortOrder:   z.number().int().min(0).optional().default(0),
});

export const updateBudgetItemSchema = z.object({
  description: z.string().min(3).max(300).optional(),
  unit:        z.string().min(1).max(20).optional(),
  quantity:    z.number().positive().multipleOf(0.001).optional(),
  unitPrice:   z.number().positive().multipleOf(0.01).optional(),
  meta:        z.string().max(150).optional(),
  submeta:     z.string().max(150).optional(),
  category:    z.string().max(100).optional(),
  notes:       z.string().max(2000).optional(),
  sortOrder:   z.number().int().min(0).optional(),
});

export const reorderItemsSchema = z.object({
  items: z.array(z.object({
    id:        z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })).min(1),
});

export const itemIdSchema = z.object({
  id: z.string().uuid("ID do item inválido"),
});

export const budgetIdParamSchema = z.object({
  budgetId: z.string().uuid("ID do orçamento inválido"),
});

export type CreateBudgetItemInput = z.infer<typeof createBudgetItemSchema>;
export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemSchema>;
export type ReorderItemsInput     = z.infer<typeof reorderItemsSchema>;
