import type { Request, Response } from "express";
import { getPriceTables, listItemsByTable } from "../../lib/etl-client.js";

// GET /price-tables
export async function listPriceTables(_req: Request, res: Response) {
  try {
    const tables = await getPriceTables();
    res.json(tables);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar tabelas";
    const status  = message.includes("timeout") ? 504 : 502;
    res.status(status).json({ error: message });
  }
}

// GET /price-tables/items?tableId=<uuid>&type=COMPOSICAO&page=1&limit=100
export async function listPriceTableItems(req: Request, res: Response) {
  const { tableId, type, page, limit } = req.query as Record<string, string>

  if (!tableId) {
    res.status(400).json({ error: 'tableId é obrigatório' })
    return
  }

  try {
    const data = await listItemsByTable({
      tableId,
      type,
      page:  page  ? parseInt(page)  : 1,
      limit: limit ? parseInt(limit) : 50,
    })
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar itens"
    const status  = message.includes("timeout") ? 504 : 502
    res.status(status).json({ error: message })
  }
}