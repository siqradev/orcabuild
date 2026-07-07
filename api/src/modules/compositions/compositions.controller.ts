// src/modules/compositions/compositions.controller.ts

import type { Request, Response } from "express";
import {
  compositionCodeParamSchema,
  compositionDetailQuerySchema,
  compositionListQuerySchema,
  addInsumoSchema,
  insumoIdParamSchema,
  updatePricingSchema,
} from "./compositions.schemas.js";

import {
  getCompositionDetail,
  addInsumo,
  removeInsumo,
  updatePricing,
  listCompositions,
} from "./compositions.service.js";

function errorStatus(message: string): number {
  if (message.includes("não encontrad")) return 404;
  if (message.includes("timeout") || message.includes("ETL API")) return 502;
  return 400;
}

// GET /compositions/:code/detail?tableId=<uuid>
export async function getDetail(req: Request, res: Response) {
  const params = compositionCodeParamSchema.safeParse(req.params);
  const query  = compositionDetailQuerySchema.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }
  try {
    res.json(await getCompositionDetail(params.data.code, query.data.tableId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /compositions/:code/insumos
export async function addInsumoToComposition(req: Request, res: Response) {
  const params = compositionCodeParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Código inválido" });
    return;
  }
  const body = addInsumoSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(
      await addInsumo(params.data.code, body.data, req.user!.id, req.user!.name)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// DELETE /compositions/insumos/:compositionId
export async function removeInsumoFromComposition(req: Request, res: Response) {
  const params = insumoIdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    res.json(await removeInsumo(params.data.compositionId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// PATCH /compositions/:code/pricing
export async function updateCompositionPricing(req: Request, res: Response) {
  const params = compositionCodeParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Código inválido" });
    return;
  }
  const body = updatePricingSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.json(await updatePricing(params.data.code, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// GET /compositions?tableId=<uuid>&q=<opcional>
export async function listCompositionsHandler(req: Request, res: Response) {
  const query = compositionListQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Parâmetros inválidos", details: query.error.flatten().fieldErrors });
    return;
  }
  try {
    res.json(await listCompositions(query.data.tableId, query.data.q));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}