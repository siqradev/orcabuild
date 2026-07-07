// src/modules/compositions/compositions.schemas.ts

import { z } from "zod";

export const compositionCodeParamSchema = z.object({
  code: z.string().min(1, "Código da composição é obrigatório"),
});

export const compositionDetailQuerySchema = z.object({
  tableId: z.string().uuid("tableId inválido"),
});

export const addInsumoSchema = z.object({
  tableId:     z.string().uuid("tableId inválido"),
  source:      z.enum(["CATALOG", "MANUAL"]),
  category:    z.enum(["MAO_DE_OBRA", "MATERIAL", "EQUIPAMENTO"]),
  coefficient: z.number().positive("Coeficiente deve ser maior que zero"),
  // CATALOG
  catalogCode:    z.string().optional(),
  catalogTableId: z.string().uuid().optional(),
  // MANUAL
  description: z.string().min(3).max(300).optional(),
  unit:        z.string().min(1).max(20).optional(),
  unitPrice:   z.number().positive().optional(),
}).refine(
  (data) => data.source === "CATALOG"
    ? !!data.catalogCode && !!data.catalogTableId
    : !!data.description && !!data.unit && data.unitPrice !== undefined,
  { message: "Para CATALOG informe catalogCode e catalogTableId. Para MANUAL informe description, unit e unitPrice." }
);

export const insumoIdParamSchema = z.object({
  compositionId: z.string().uuid("ID do insumo inválido"),
});

export const updatePricingSchema = z.object({
  tableId:         z.string().uuid("tableId inválido"),
  encargosSociais: z.number().min(0).max(500).optional(),
  bdi:             z.number().min(0).max(200).optional(),
});

export const compositionListQuerySchema = z.object({
  tableId: z.string().uuid("tableId inválido"),
  q:       z.string().min(2).optional(),
});

export type AddInsumoInput      = z.infer<typeof addInsumoSchema>;
export type UpdatePricingInput  = z.infer<typeof updatePricingSchema>;
