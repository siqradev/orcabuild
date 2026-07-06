// src/modules/quotations/quotations.controller.ts

import type { Request, Response } from "express";
import {
  createQuotationSchema,
  listQuotationsSchema,
  searchQuotationsSchema,
  quotationIdSchema,
  addQuoteSchema,
  quoteIdSchema,
  approveQuotationSchema,
  createPendingItemSchema,
} from "./quotations.schemas.js";
import {
  createQuotation,
  listQuotations,
  searchQuotations,
  getQuotation,
  addQuote,
  removeQuote,
  approveQuotation,
  createPendingItem,
} from "./quotations.service.js";

function errorStatus(message: string): number {
  if (message.includes("não encontrado"))                 return 404;
  if (message.includes("já foi aprovado"))                return 409;
  if (message.includes("não pertence") || message.includes("São necessárias")) return 422;
  if (message.includes("timeout") || message.includes("ETL API")) return 502;
  return 400;
}

// POST /quotations
export async function create(req: Request, res: Response) {
  const body = createQuotationSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(
      await createQuotation(body.data, req.user!.id, req.user!.name)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// GET /quotations?status=OPEN
export async function list(req: Request, res: Response) {
  const query = listQuotationsSchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Query inválida", details: query.error.flatten().fieldErrors });
    return;
  }
  try {
    res.json(await listQuotations(query.data.status));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// GET /quotations/search?q=tubo
export async function search(req: Request, res: Response) {
  const query = searchQuotationsSchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Query inválida", details: query.error.flatten().fieldErrors });
    return;
  }
  try {
    res.json(await searchQuotations(query.data.q));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// GET /quotations/:id
export async function getOne(req: Request, res: Response) {
  const params = quotationIdSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    res.json(await getQuotation(params.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /quotations/:id/quotes
export async function addQuoteToQuotation(req: Request, res: Response) {
  const params = quotationIdSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const body = addQuoteSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(await addQuote(params.data.id, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// DELETE /quotations/quotes/:quoteId
export async function removeQuoteFromQuotation(req: Request, res: Response) {
  const params = quoteIdSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    res.json(await removeQuote(params.data.quoteId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /quotations/:id/approve
export async function approve(req: Request, res: Response) {
  const params = quotationIdSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const body = approveQuotationSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.json(await approveQuotation(params.data.id, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}
// POST /quotations/:id/pending-item
export async function createPendingItemHandler(req: Request, res: Response) {
  const params = quotationIdSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const body = createPendingItemSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(await createPendingItem(params.data.id, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}