// src/modules/purchase-requests/purchase-requests.controller.ts

import type { Request, Response } from "express";
import {
  createPurchaseRequestSchema,
  purchaseRequestIdSchema,
  addSupplierQuoteSchema,
  approveItemsSchema,
  supplierQuoteIdSchema,
} from "./purchase-requests.schemas.js";
import {
  createPurchaseRequest,
  listPurchaseRequests,
  getPurchaseRequest,
  addSupplierQuote,
  removeSupplierQuote,
  approveAndGenerateOrders,
  getComparativeMap,
} from "./purchase-requests.service.js";

function errorStatus(message: string): number {
  if (message.includes("não encontrad")) return 404;
  if (message.includes("não pertencem") || message.includes("não é possível")) return 422;
  return 400;
}

// POST /purchase-requests
export async function create(req: Request, res: Response) {
  const body = createPurchaseRequestSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(await createPurchaseRequest(body.data, req.user!.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// GET /purchase-requests?budgetId=<uuid>
export async function list(req: Request, res: Response) {
  const { budgetId } = req.query as { budgetId?: string };
  try {
    const requests = await listPurchaseRequests(budgetId);
    res.json({ requests, count: requests.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar solicitações" });
  }
}

// GET /purchase-requests/:id
export async function getOne(req: Request, res: Response) {
  const params = purchaseRequestIdSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    res.json(await getPurchaseRequest(params.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// GET /purchase-requests/:id/map
export async function comparativeMap(req: Request, res: Response) {
  const params = purchaseRequestIdSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    res.json(await getComparativeMap(params.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /purchase-requests/:id/quotes
export async function addQuote(req: Request, res: Response) {
  const params = purchaseRequestIdSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  const body = addSupplierQuoteSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(await addSupplierQuote(params.data.id, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// DELETE /purchase-requests/quotes/:quoteId
export async function removeQuote(req: Request, res: Response) {
  const params = supplierQuoteIdSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    await removeSupplierQuote(params.data.quoteId);
    res.json({ message: "Cotação removida com sucesso" });
  } catch (err) {
    res.status(400).json({ error: "Erro ao remover cotação" });
  }
}

// POST /purchase-requests/:id/approve
export async function approve(req: Request, res: Response) {
  const params = purchaseRequestIdSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  const body = approveItemsSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.json(await approveAndGenerateOrders(params.data.id, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}
