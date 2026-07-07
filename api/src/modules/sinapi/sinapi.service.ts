// src/modules/sinapi/sinapi.service.ts

import { prisma }                 from "../../lib/prisma.js";
import { recalculateBudgetTotal } from "../budgets/budgets.service.js";
import {
  getItemByCode,
  searchItems,
  checkEtlHealth,
  getPriceTables,
  createQuotation,
  createPendingItem,
  createEmptyComposition,
} from "../../lib/etl-client.js";

import type { UserRole }          from "../../generated/client.js";
import type {
  SearchCatalogQuery,
  AddCatalogItemInput,
  AddManyCatalogItemsInput,
  CreatePendingQuotationItemInput,
  CreateEmptyCompositionItemInput,
} from "./sinapi.schemas.js";

// ─────────────────────────────────────────────
// Helper: verifica se o orçamento existe,
// pertence ao usuário e ainda aceita edições
// ─────────────────────────────────────────────
async function assertBudgetEditable(
  budgetId: string,
  userId: string,
  userRole: UserRole
) {
  const budget = await prisma.budget.findUnique({
    where:   { id: budgetId },
    include: { project: true },
  });

  if (!budget) throw new Error("Orçamento não encontrado");

  if (userRole !== "ADMIN" && budget.project.userId !== userId) {
    throw new Error("Acesso negado");
  }

  if (budget.status === "APPROVED" || budget.status === "ARCHIVED") {
    throw new Error(
      `Orçamentos com status "${budget.status}" não aceitam novos itens.`
    );
  }

  return budget;
}

// ─────────────────────────────────────────────
// Buscar itens no catálogo ETL
// ─────────────────────────────────────────────
export async function searchCatalog(query: SearchCatalogQuery) {
  return searchItems(query.q, query.tableId, {
    type:  query.type,
    limit: query.limit,
  });
}

// ─────────────────────────────────────────────
// Adicionar um item do catálogo ao orçamento
// ─────────────────────────────────────────────
export async function addCatalogItemToBudget(
  budgetId: string,
  userId: string,
  userRole: UserRole,
  input: AddCatalogItemInput
) {
  await assertBudgetEditable(budgetId, userId, userRole);

  const catalogItem = await getItemByCode(input.code, input.tableId);
  const unitPrice = parseFloat(catalogItem.basePrice);

  if (isNaN(unitPrice) || unitPrice <= 0) {
    throw new Error(
      `Item "${input.code}" não possui preço válido no catálogo.`
    );
  }

  const totalPrice = parseFloat((input.quantity * unitPrice).toFixed(2));

  const lastItem = await prisma.budgetItem.findFirst({
    where:   { budgetId },
    orderBy: { sortOrder: "desc" },
    select:  { sortOrder: true },
  });

  const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

  const item = await prisma.budgetItem.create({
    data: {
      description: catalogItem.description,
      unit:        catalogItem.unit,
      quantity:    input.quantity,
      unitPrice,
      totalPrice,
      meta:        input.meta,
      submeta:     input.submeta,
      category:    input.category,
      notes:       input.notes
        ? `[${catalogItem.priceTable?.source ?? "SINAPI"} ${catalogItem.code}] ${input.notes}`
        : `[${catalogItem.priceTable?.source ?? "SINAPI"} ${catalogItem.code}]`,
      sortOrder,
      budgetId,
    },
  });

  const budgetTotalCost = await recalculateBudgetTotal(budgetId);

  return {
    item,
    catalogItem: {
      code:      catalogItem.code,
      source:    catalogItem.priceTable?.source,
      tableType: catalogItem.priceTable?.type,
    },
    budgetTotalCost,
  };
}

// ─────────────────────────────────────────────
// Adicionar múltiplos itens do catálogo de uma vez
// ─────────────────────────────────────────────
export async function addManyCatalogItemsToBudget(
  budgetId: string,
  userId: string,
  userRole: UserRole,
  input: AddManyCatalogItemsInput
) {
  await assertBudgetEditable(budgetId, userId, userRole);

  const catalogItems = await Promise.all(
    input.items.map((i) => getItemByCode(i.code, input.tableId))
  );

  const invalidItems = catalogItems.filter(
    (item) => isNaN(parseFloat(item.basePrice)) || parseFloat(item.basePrice) <= 0
  );

  if (invalidItems.length > 0) {
    throw new Error(
      `Os seguintes códigos não possuem preço válido: ${invalidItems.map((i) => i.code).join(", ")}`
    );
  }

  const lastItem = await prisma.budgetItem.findFirst({
    where:   { budgetId },
    orderBy: { sortOrder: "desc" },
    select:  { sortOrder: true },
  });

  let nextOrder = (lastItem?.sortOrder ?? -1) + 1;

  const createdItems = await prisma.$transaction(async (tx) => {
    const results = [];

    for (let i = 0; i < catalogItems.length; i++) {
      const catalogItem = catalogItems[i];
      const inputItem   = input.items[i];
      const unitPrice   = parseFloat(catalogItem.basePrice);
      const totalPrice  = parseFloat((inputItem.quantity * unitPrice).toFixed(2));

      const item = await tx.budgetItem.create({
        data: {
          description: catalogItem.description,
          unit:        catalogItem.unit,
          quantity:    inputItem.quantity,
          unitPrice,
          totalPrice,
          meta:        inputItem.meta,
          submeta:     inputItem.submeta,
          category:    inputItem.category,
          notes:       `[${catalogItem.priceTable?.source ?? "SINAPI"} ${catalogItem.code}]`,
          sortOrder:   nextOrder++,
          budgetId,
        },
      });

      results.push(item);
    }

    return results;
  });

  const budgetTotalCost = await recalculateBudgetTotal(budgetId);

  return {
    message:        `${createdItems.length} item(ns) adicionado(s) do catálogo`,
    items:          createdItems,
    budgetTotalCost,
  };
}

// ─────────────────────────────────────────────
// Status da integração com a etl-api
// ─────────────────────────────────────────────
export async function getIntegrationStatus() {
  const etlOnline = await checkEtlHealth();

  return {
    etlApi: {
      url:    process.env.ETL_API_URL ?? "http://localhost:3001",
      status: etlOnline ? "online" : "offline",
    },
  };
}

// ─────────────────────────────────────────────
// Helper: busca o ID da tabela PRÓPRIA
// ─────────────────────────────────────────────
async function getOwnPriceTableId(): Promise<string> {
  const tables = await getPriceTables();
  const own = tables.find((t) => t.source === "PROPRIA");
  if (!own) {
    throw new Error(
      "Tabela de itens próprios não encontrada. Contate o suporte."
    );
  }
  return own.id;
}

// ─────────────────────────────────────────────
// Adicionar item PENDENTE DE COTAÇÃO ao orçamento (sem preço ainda)
// ─────────────────────────────────────────────
export async function addPendingQuotationItemToBudget(
  budgetId: string,
  userId: string,
  userRole: UserRole,
  userName: string,
  input: CreatePendingQuotationItemInput
) {
  await assertBudgetEditable(budgetId, userId, userRole);

  const priceTableId = await getOwnPriceTableId();

  const { quotation } = await createQuotation({
    description: input.description,
    unit: input.unit,
    createdByUserId: userId,
    createdByName: userName,
  });

  const { item: catalogItem } = await createPendingItem({
    quotationId: quotation.id,
    description: input.description,
    unit: input.unit,
    priceTableId,
  });

  const lastItem = await prisma.budgetItem.findFirst({
    where: { budgetId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

  const item = await prisma.budgetItem.create({
    data: {
      description: catalogItem.description,
      unit: catalogItem.unit,
      quantity: input.quantity,
      unitPrice: 0,
      totalPrice: 0,
      meta: input.meta,
      submeta: input.submeta,
      notes: `[PROPRIA ${catalogItem.code}] [PENDENTE-COTACAO ${quotation.id}]`,
      sortOrder,
      budgetId,
    },
  });

  const budgetTotalCost = await recalculateBudgetTotal(budgetId);

  return {
    item,
    catalogItem: { code: catalogItem.code, source: "PROPRIA", quotationId: quotation.id },
    budgetTotalCost,
  };
}

// ─────────────────────────────────────────────
// Adicionar item de COMPOSIÇÃO PRÓPRIA (vazia) ao orçamento
// ─────────────────────────────────────────────
export async function addEmptyCompositionItemToBudget(
  budgetId: string,
  userId: string,
  userRole: UserRole,
  userName: string,
  input: CreateEmptyCompositionItemInput
) {
  await assertBudgetEditable(budgetId, userId, userRole);

  const priceTableId = await getOwnPriceTableId();

  const { item: catalogItem } = await createEmptyComposition({
    description: input.description,
    unit: input.unit,
    createdByUserId: userId,
    createdByName: userName,
    priceTableId,
  });

  const lastItem = await prisma.budgetItem.findFirst({
    where: { budgetId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

  const item = await prisma.budgetItem.create({
    data: {
      description: catalogItem.description,
      unit: catalogItem.unit,
      quantity: input.quantity,
      unitPrice: 0,
      totalPrice: 0,
      meta: input.meta,
      submeta: input.submeta,
      notes: `[PROPRIA ${catalogItem.code}] [PENDENTE-COMPOSICAO]`,
      sortOrder,
      budgetId,
    },
  });

  const budgetTotalCost = await recalculateBudgetTotal(budgetId);

  return {
    item,
    catalogItem: { code: catalogItem.code, source: "PROPRIA" },
    budgetTotalCost,
  };
}
