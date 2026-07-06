// src/modules/quotations/quotations.schemas.ts

import { z } from "zod";

export const createQuotationSchema = z.object({
  description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres").max(300),
  unit:        z.string().min(1, "Unidade é obrigatória").max(20),
});

export const listQuotationsSchema = z.object({
  status: z.enum(["PENDING", "OPEN", "APPROVED", "EXPIRED"]).optional(),
});

export const searchQuotationsSchema = z.object({
  q: z.string().min(2, "Busca deve ter no mínimo 2 caracteres"),
});

export const quotationIdSchema = z.object({
  id: z.string().uuid("ID do pedido de cotação inválido"),
});

export const addQuoteSchema = z.object({
  supplierName: z.string().min(2, "Nome do fornecedor é obrigatório").max(200),
  unitPrice:    z.number().positive("Preço unitário deve ser maior que zero"),
  ipi:          z.number().min(0).max(100).optional(),
  icms:         z.number().min(0).max(100).optional(),
  freightType:  z.enum(["FOB", "CIF"]).optional(),
  notes:        z.string().max(1000).optional(),
});

export const quoteIdSchema = z.object({
  quoteId: z.string().uuid("ID da cotação inválido"),
});

export const approveQuotationSchema = z.object({
  quoteId:      z.string().uuid("ID da cotação vencedora inválido"),
  priceTableId: z.string().uuid("ID da tabela de preços inválido"),
});

export const createPendingItemSchema = z.object({
  description:  z.string().min(3, "Descrição deve ter no mínimo 3 caracteres").max(300),
  unit:         z.string().min(1, "Unidade é obrigatória").max(20),
  priceTableId: z.string().uuid("ID da tabela de preços inválido"),
});

export type CreatePendingItemInput = z.infer<typeof createPendingItemSchema>;
export type CreateQuotationInput  = z.infer<typeof createQuotationSchema>;
export type ListQuotationsQuery   = z.infer<typeof listQuotationsSchema>;
export type SearchQuotationsQuery = z.infer<typeof searchQuotationsSchema>;
export type AddQuoteInput         = z.infer<typeof addQuoteSchema>;
export type ApproveQuotationInput = z.infer<typeof approveQuotationSchema>;
