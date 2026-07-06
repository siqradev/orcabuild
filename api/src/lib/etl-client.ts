import "dotenv/config";

export interface EtlItem {
  id:           string;
  code:         string;
  description:  string;
  unit:         string;
  basePrice:    string;
  type:         "INSUMO" | "COMPOSICAO";
  category:     string | null;
  priceTableId: string;
  priceTable: {
    id:        string;
    source:    string;
    type:      string;
    state:     string;
    reference: string;
  };
}

export interface EtlSearchResult {
  items: EtlItem[];
}

export interface EtlPriceTable {
  id:          string;
  source:      string;
  type:        string;
  state:       string;
  reference:   string;
  description: string;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-key":    process.env.ETL_API_KEY ?? "",
  };
}

function getBaseUrl() {
  return process.env.ETL_API_URL ?? "http://localhost:3001";
}

async function etlFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const controller = new AbortController();
  const timeout    = parseInt(process.env.ETL_API_TIMEOUT ?? "15000", 10);
  const timer      = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method:  options?.method ?? "GET",
      headers: getHeaders(),
      body:    options?.body ? JSON.stringify(options.body) : undefined,
      signal:  controller.signal,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (res.status === 404) throw new Error(`Item não encontrado no catálogo: ${path}`);
      throw new Error((errBody as any).error ?? `ETL API retornou erro ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError")
      throw new Error("ETL API demorou demais para responder (timeout)");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}


/** Busca itens pelo texto e tableId */
export async function searchItems(
  query: string,
  tableId: string,
  options?: { type?: string; limit?: number }
): Promise<EtlSearchResult> {
  const params = new URLSearchParams({ q: query, tableId })
  if (options?.type)  params.set('type',  options.type)
  if (options?.limit) params.set('limit', String(options.limit))

  // A ETL usa /items/search e retorna { results, count }
  const data = await etlFetch<{ results: EtlItem[]; count: number }>(
    `/items/search?${params}`
  )

  // Normaliza para o formato esperado { items }
  return { items: data.results }
}

/** Busca item pelo código + tableId */
export async function getItemByCode(code: string, tableId: string): Promise<EtlItem> {
  return etlFetch<EtlItem>(`/items/${encodeURIComponent(code)}?tableId=${tableId}`);
}

/** Lista tabelas de preços disponíveis */
export async function getPriceTables(): Promise<EtlPriceTable[]> {
  return etlFetch<EtlPriceTable[]>("/price-tables");
}

/** Verifica se a etl-api está disponível */
export async function checkEtlHealth(): Promise<boolean> {
  try {
    await etlFetch<{ status: string }>("/health");
    return true;
  } catch {
    return false;
  }
}

// ─── Cotações ──────────────────────────────────────────────────────────────

export interface EtlQuote {
  id:           string;
  quotationId:  string;
  supplierName: string;
  unitPrice:    string;
  ipi:          string | null;
  icms:         string | null;
  freightType:  "FOB" | "CIF" | null;
  notes:        string | null;
  createdAt:    string;
}

export interface EtlQuotation {
  id:              string;
  description:     string;
  unit:            string;
  status:          "PENDING" | "OPEN" | "APPROVED" | "EXPIRED";
  createdByUserId: string;
  createdByName:   string;
  approvedQuoteId: string | null;
  approvedAt:      string | null;
  expiresAt:       string | null;
  resultItemId:    string | null;
  createdAt:       string;
  updatedAt:       string;
  quotes:          EtlQuote[];
}

export async function createQuotation(data: {
  description: string;
  unit: string;
  createdByUserId: string;
  createdByName: string;
}): Promise<{ quotation: EtlQuotation }> {
  return etlFetch(`/quotations`, { method: "POST", body: data });
}

export async function listQuotations(status?: string): Promise<{ quotations: EtlQuotation[]; count: number }> {
  const params = status ? `?status=${status}` : "";
  return etlFetch(`/quotations${params}`);
}

export async function searchQuotations(query: string): Promise<{ quotations: EtlQuotation[]; count: number }> {
  return etlFetch(`/quotations/search?q=${encodeURIComponent(query)}`);
}

export async function getQuotation(id: string): Promise<{ quotation: EtlQuotation }> {
  return etlFetch(`/quotations/${id}`);
}

export async function addQuote(quotationId: string, data: {
  supplierName: string;
  unitPrice: number;
  ipi?: number;
  icms?: number;
  freightType?: "FOB" | "CIF";
  notes?: string;
}): Promise<{ quote: EtlQuote }> {
  return etlFetch(`/quotations/${quotationId}/quotes`, { method: "POST", body: data });
}

export async function removeQuote(quoteId: string): Promise<{ message: string }> {
  return etlFetch(`/quotations/quotes/${quoteId}`, { method: "DELETE" });
}

export async function approveQuotation(
  quotationId: string,
  data: { quoteId: string; priceTableId: string }
): Promise<{ quotation: EtlQuotation }> {
  return etlFetch(`/quotations/${quotationId}/approve`, { method: "POST", body: data });
}

// ─── Itens pendentes (Cotação / Composição Própria) ─────────────────────────

export async function createEmptyComposition(data: {
  description: string;
  unit: string;
  createdByUserId: string;
  createdByName: string;
  priceTableId: string;
}): Promise<{ item: EtlItem }> {
  return etlFetch(`/compositions/create-empty`, { method: "POST", body: data });
}

export async function createPendingItem(data: {
  quotationId: string;
  description: string;
  unit: string;
  priceTableId: string;
}): Promise<{ item: EtlItem }> {
  return etlFetch(`/items/create-pending`, { method: "POST", body: data });
}

// ─── Composições próprias ────────────────────────────────────────────────────

export interface EtlCompositionInsumo {
  compositionId: string;
  category: "MAO_DE_OBRA" | "MATERIAL" | "EQUIPAMENTO";
  itemId: string;
  code: string;
  description: string;
  unit: string;
  coefficient: number;
  unitPrice: number;
  total: number;
  hasPrice: boolean;
}

export interface EtlCompositionDetail {
  item: {
    id: string;
    code: string;
    description: string;
    unit: string;
    encargosSociais: number;
    bdi: number;
  };
  insumos: EtlCompositionInsumo[];
  totals: {
    maoDeObraTotal: number;
    encargosValor: number;
    materialTotal: number;
    equipamentoTotal: number;
    custoDireto: number;
    bdiValor: number;
    valorGeral: number;
  };
}

export async function getCompositionDetail(code: string, tableId: string): Promise<EtlCompositionDetail> {
  return etlFetch(`/compositions/${encodeURIComponent(code)}/detail?tableId=${tableId}`);
}

export async function addCompositionInsumo(code: string, data: {
  tableId: string;
  source: "CATALOG" | "MANUAL";
  category: "MAO_DE_OBRA" | "MATERIAL" | "EQUIPAMENTO";
  coefficient: number;
  catalogCode?: string;
  catalogTableId?: string;
  description?: string;
  unit?: string;
  unitPrice?: number;
  createdByUserId?: string;
  createdByName?: string;
}): Promise<{ composition: any }> {
  return etlFetch(`/compositions/${encodeURIComponent(code)}/insumos`, { method: "POST", body: data });
}

export async function removeCompositionInsumo(compositionId: string): Promise<{ message: string }> {
  return etlFetch(`/compositions/insumos/${compositionId}`, { method: "DELETE" });
}

export async function updateCompositionPricing(code: string, data: {
  tableId: string;
  encargosSociais?: number;
  bdi?: number;
}): Promise<{ item: EtlItem; totals: EtlCompositionDetail["totals"] }> {
  return etlFetch(`/compositions/${encodeURIComponent(code)}/pricing`, { method: "PATCH", body: data });
}

export interface EtlCompositionListItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  basePrice: number;
  encargosSociais: number;
  bdi: number;
  insumosCount: number;
  updatedAt: string;
}

export async function listCompositions(tableId: string, q?: string): Promise<{ results: EtlCompositionListItem[]; count: number }> {
  const params = new URLSearchParams({ tableId });
  if (q) params.set("q", q);
  return etlFetch(`/compositions/list?${params.toString()}`);
}
// ─── Listagem de itens por tabela ────────────────────────────────────────────
export async function listItemsByTable(params: {
  tableId: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: EtlItem[]; total: number; page: number; limit: number; totalPages: number }> {
  const p = new URLSearchParams({ tableId: params.tableId })
  if (params.type)  p.set('type',  params.type)
  if (params.page)  p.set('page',  String(params.page))
  if (params.limit) p.set('limit', String(params.limit))
  return etlFetch(`/items?${p}`)
}