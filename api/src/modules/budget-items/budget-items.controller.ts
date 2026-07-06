// src/modules/budget-items/budget-items.controller.ts

import type { Request, Response } from "express";
import {
  createBudgetItemSchema,
  updateBudgetItemSchema,
  reorderItemsSchema,
  itemIdSchema,
  budgetIdParamSchema,
} from "./budget-items.schemas.js";
import {
  listItems,
  createItem,
  createManyItems,
  updateItem,
  reorderItems,
  deleteItem,
  clearItems,
} from "./budget-items.service.js";

function parseBudgetId(req: Request, res: Response) {
  const result = budgetIdParamSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ error: "ID do orçamento inválido" });
    return null;
  }
  return result.data.budgetId;
}

function parseItemId(req: Request, res: Response) {
  const result = itemIdSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ error: "ID do item inválido" });
    return null;
  }
  return result.data.id;
}

function errorStatus(message: string): number {
  if (message.includes("não encontrado"))  return 404;
  if (message.includes("Acesso negado"))   return 403;
  if (message.includes("não aceitam"))     return 422;
  return 500;
}

// GET /budgets/:budgetId/items
export async function list(req: Request, res: Response) {
  const budgetId = parseBudgetId(req, res);
  if (!budgetId) return;

  try {
    res.json(await listItems(budgetId, req.user!.id, req.user!.role));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /budgets/:budgetId/items
export async function create(req: Request, res: Response) {
  const budgetId = parseBudgetId(req, res);
  if (!budgetId) return;

  const body = createBudgetItemSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }

  try {
    res.status(201).json(
      await createItem(budgetId, req.user!.id, req.user!.role, body.data)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /budgets/:budgetId/items/batch
export async function createBatch(req: Request, res: Response) {
  const budgetId = parseBudgetId(req, res);
  if (!budgetId) return;

  const body = createBudgetItemSchema.array().min(1).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
    return;
  }

  try {
    res.status(201).json(
      await createManyItems(budgetId, req.user!.id, req.user!.role, body.data)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// PATCH /items/:id
export async function update(req: Request, res: Response) {
  const itemId = parseItemId(req, res);
  if (!itemId) return;

  const body = updateBudgetItemSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }

  try {
    res.json(await updateItem(itemId, req.user!.id, req.user!.role, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// PATCH /budgets/:budgetId/items/reorder
export async function reorder(req: Request, res: Response) {
  const budgetId = parseBudgetId(req, res);
  if (!budgetId) return;

  const body = reorderItemsSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }

  try {
    res.json(await reorderItems(budgetId, req.user!.id, req.user!.role, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// DELETE /items/:id
export async function remove(req: Request, res: Response) {
  const itemId = parseItemId(req, res);
  if (!itemId) return;

  try {
    res.json(await deleteItem(itemId, req.user!.id, req.user!.role));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// DELETE /budgets/:budgetId/items
export async function clear(req: Request, res: Response) {
  const budgetId = parseBudgetId(req, res);
  if (!budgetId) return;

  try {
    res.json(await clearItems(budgetId, req.user!.id, req.user!.role));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}