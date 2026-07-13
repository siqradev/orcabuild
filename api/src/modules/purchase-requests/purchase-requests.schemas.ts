// src/modules/purchase-requests/purchase-requests.schemas.ts

import { z } from "zod";

export const createPurchaseRequestSchema = z.object({
  budgetId: z.string().uuid("ID do orçamento inválido"),
  title:    z.string().min(3).max(200),
  items:    z.array(z.object({
    budgetItemId:      z.string().uuid(),
    quantityRequested: z.number().positive(),
  })).min(1, "Selecione ao menos um item"),
});

export const purchaseRequestIdSchema = z.object({
  id: z.string().uuid("ID inválido"),
});

export const addSupplierQuoteSchema = z.object({
  supplierName:    z.string().min(2).max(200),
  supplierContact: z.string().max(200).optional(),
  validUntil:      z.string().datetime({ message: "Data inválida" }),
  notes:           z.string().max(1000).optional(),
  items: z.array(z.object({
    purchaseRequestItemId: z.string().uuid(),
    unitPrice:             z.number().positive(),
    notes:                 z.string().max(500).optional(),
  })).min(1),
});

export const approveItemsSchema = z.object({
  approvals: z.array(z.object({
    purchaseRequestItemId: z.string().uuid(),
    supplierQuoteId:       z.string().uuid(),
    quantity:              z.number().positive(),
  })).min(1),
});

export const supplierQuoteIdSchema = z.object({
  quoteId: z.string().uuid("ID inválido"),
});

export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
export type AddSupplierQuoteInput      = z.infer<typeof addSupplierQuoteSchema>;
export type ApproveItemsInput          = z.infer<typeof approveItemsSchema>;
