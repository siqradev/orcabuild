// src/modules/sinapi/sinapi.controller.ts

import type { Request, Response } from "express";
import {
  searchCatalogSchema,
  addCatalogItemSchema,
  addManyCatalogItemsSchema,
  budgetIdParamSchema,
  createPendingQuotationItemSchema,
  createEmptyCompositionItemSchema,
} from "./sinapi.schemas.js";
import {
  searchCatalog,
  addCatalogItemToBudget,
  addManyCatalogItemsToBudget,
  getIntegrationStatus,
  addPendingQuotationItemToBudget,
  addEmptyCompositionItemToBudget,
} from "./sinapi.service.js";

function parseBudgetId(req: Request, res: Response) {
  const result = budgetIdParamSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ error: "ID do orçamento inválido" });
    return null;
  }
  return result.data.budgetId;
}

function errorStatus(message: string): number {
  if (message.includes("não encontrado"))  return 404;
  if (message.includes("Acesso negado"))   return 403;
  if (message.includes("não aceitam") || message.includes("não possui")) return 422;
  if (message.includes("timeout") || message.includes("ETL API")) return 502;
  return 500;
}

// GET /sinapi/search?q=concreto&type=INSUMO
export async function search(req: Request, res: Response) {
  const query = searchCatalogSchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Query inválida", details: query.error.flatten().fieldErrors });
    return;
  }
  try {
    res.json(await searchCatalog(query.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /budgets/:budgetId/sinapi
export async function addItem(req: Request, res: Response) {
  const budgetId = parseBudgetId(req, res);
  if (!budgetId) return;
  const body = addCatalogItemSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(
      await addCatalogItemToBudget(budgetId, req.user!.id, req.user!.role, body.data)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /budgets/:budgetId/sinapi/batch
export async function addManyItems(req: Request, res: Response) {
  const budgetId = parseBudgetId(req, res);
  if (!budgetId) return;
  const body = addManyCatalogItemsSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(
      await addManyCatalogItemsToBudget(budgetId, req.user!.id, req.user!.role, body.data)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// GET /sinapi/status
export async function status(req: Request, res: Response) {
  try {
    res.json(await getIntegrationStatus());
  } catch (err) {
    res.status(500).json({ error: "Erro ao verificar status da integração" });
  }
}

// POST /budgets/:budgetId/sinapi/pending-quotation
export async function addPendingQuotation(req: Request, res: Response) {
  const budgetId = parseBudgetId(req, res);
  if (!budgetId) return;
  const body = createPendingQuotationItemSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(
      await addPendingQuotationItemToBudget(
        budgetId,
        req.user!.id,
        req.user!.role,
        req.user!.name,
        body.data
      )
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /budgets/:budgetId/sinapi/empty-composition
export async function addEmptyComposition(req: Request, res: Response) {
  const budgetId = parseBudgetId(req, res);
  if (!budgetId) return;
  const body = createEmptyCompositionItemSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(
      await addEmptyCompositionItemToBudget(
        budgetId,
        req.user!.id,
        req.user!.role,
        req.user!.name,
        body.data
      )
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}
