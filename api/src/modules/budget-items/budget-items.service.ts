// src/modules/budget-items/budget-items.service.ts

import { prisma }                    from "../../lib/prisma.js";
import { recalculateBudgetTotal }    from "../budgets/budgets.service.js";
import type { UserRole }             from "../../generated/client.js";
import type {
  CreateBudgetItemInput,
  UpdateBudgetItemInput,
  ReorderItemsInput,
} from "./budget-items.schemas.js";

// ─────────────────────────────────────────────
// Helper: verifica acesso ao orçamento e bloqueia
// orçamentos que não aceitam mais edições
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

  if (!budget) {
    throw new Error("Orçamento não encontrado");
  }

  if (userRole !== "ADMIN" && budget.project.userId !== userId) {
    throw new Error("Acesso negado");
  }

  if (budget.status === "APPROVED" || budget.status === "ARCHIVED") {
    throw new Error(
      `Orçamentos com status "${budget.status}" não aceitam alterações nos itens. ` +
      `Use /budgets/:id/clone para criar uma nova versão editável.`
    );
  }

  return budget;
}

// Listar itens de um orçamento

export async function listItems(
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

  const items = await prisma.budgetItem.findMany({
    where:   { budgetId },
    orderBy: { sortOrder: "asc" },
  });

  return {
    items,
    summary: {
      totalItems: items.length,
      totalCost:  Number(budget.totalCost),
      currency:   budget.currency,
    },
  };
}

// ─────────────────────────────────────────────
// Criar item
// ─────────────────────────────────────────────
export async function createItem(
  budgetId: string,
  userId: string,
  userRole: UserRole,
  data: CreateBudgetItemInput
) {
  await assertBudgetEditable(budgetId, userId, userRole);

  // Calcula o totalPrice na API — o cliente envia quantity e unitPrice
  const totalPrice = parseFloat(
    (data.quantity * data.unitPrice).toFixed(2)
  );

  // Se sortOrder não foi enviado, coloca o item no final da lista
  if (data.sortOrder === 0) {
    const lastItem = await prisma.budgetItem.findFirst({
      where:   { budgetId },
      orderBy: { sortOrder: "desc" },
      select:  { sortOrder: true },
    });
    data.sortOrder = (lastItem?.sortOrder ?? -1) + 1;
  }

  const item = await prisma.budgetItem.create({
    data: {
      ...data,
      totalPrice,
      budgetId,
    },
  });

  // Atualiza o totalCost do orçamento após inserir o item
  const newTotal = await recalculateBudgetTotal(budgetId);

  return { item, budgetTotalCost: newTotal };
}

// ─────────────────────────────────────────────
// Criar múltiplos itens de uma vez (importação do SINAPI)
// ─────────────────────────────────────────────
export async function createManyItems(
  budgetId: string,
  userId: string,
  userRole: UserRole,
  items: CreateBudgetItemInput[]
) {
  await assertBudgetEditable(budgetId, userId, userRole);

  // Busca o maior sortOrder atual para continuar a sequência
  const lastItem = await prisma.budgetItem.findFirst({
    where:   { budgetId },
    orderBy: { sortOrder: "desc" },
    select:  { sortOrder: true },
  });

  let nextOrder = (lastItem?.sortOrder ?? -1) + 1;

  // Transação: cria todos os itens ou nenhum
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const totalPrice = parseFloat(
        (item.quantity * item.unitPrice).toFixed(2)
      );

      await tx.budgetItem.create({
        data: {
          ...item,
          totalPrice,
          budgetId,
          sortOrder: nextOrder++,
        },
      });
    }
  });

  const newTotal = await recalculateBudgetTotal(budgetId);

  return {
    message:        `${items.length} item(ns) adicionado(s) com sucesso`,
    budgetTotalCost: newTotal,
  };
}

// ─────────────────────────────────────────────
// Atualizar item
// ─────────────────────────────────────────────
export async function updateItem(
  itemId: string,
  userId: string,
  userRole: UserRole,
  data: UpdateBudgetItemInput
) {
  const item = await prisma.budgetItem.findUnique({
    where: { id: itemId },
  });

  if (!item) throw new Error("Item não encontrado");

  await assertBudgetEditable(item.budgetId, userId, userRole);

  // Recalcula totalPrice se quantity ou unitPrice mudaram
  const newQuantity  = data.quantity  ?? Number(item.quantity);
  const newUnitPrice = data.unitPrice ?? Number(item.unitPrice);
  const newTotal     = parseFloat((newQuantity * newUnitPrice).toFixed(2));

  const updated = await prisma.budgetItem.update({
    where: { id: itemId },
    data: {
      ...data,
      totalPrice: newTotal,
    },
  });

  // Recalcula o total do orçamento
  const budgetTotalCost = await recalculateBudgetTotal(item.budgetId);

  return { item: updated, budgetTotalCost };
}

// ─────────────────────────────────────────────
// Reordenar itens em lote (drag-and-drop)
// ─────────────────────────────────────────────
export async function reorderItems(
  budgetId: string,
  userId: string,
  userRole: UserRole,
  data: ReorderItemsInput
) {
  await assertBudgetEditable(budgetId, userId, userRole);

  // Atualiza todos os sortOrders em paralelo dentro de uma transação
  await prisma.$transaction(
    data.items.map(({ id, sortOrder }) =>
      prisma.budgetItem.update({
        where: { id },
        data:  { sortOrder },
      })
    )
  );

  return { message: "Itens reordenados com sucesso" };
}

// ─────────────────────────────────────────────
// Deletar item
// ─────────────────────────────────────────────
export async function deleteItem(
  itemId: string,
  userId: string,
  userRole: UserRole
) {
  const item = await prisma.budgetItem.findUnique({
    where: { id: itemId },
  });

  if (!item) throw new Error("Item não encontrado");

  await assertBudgetEditable(item.budgetId, userId, userRole);

  await prisma.budgetItem.delete({ where: { id: itemId } });

  // Recalcula o total do orçamento após remover o item
  const budgetTotalCost = await recalculateBudgetTotal(item.budgetId);

  return {
    message:      "Item removido com sucesso",
    budgetTotalCost,
  };
}

// ─────────────────────────────────────────────
// Deletar todos os itens de um orçamento
// ─────────────────────────────────────────────
export async function clearItems(
  budgetId: string,
  userId: string,
  userRole: UserRole
) {
  await assertBudgetEditable(budgetId, userId, userRole);

  const { count } = await prisma.budgetItem.deleteMany({
    where: { budgetId },
  });

  // Total vai a zero após limpar
  await prisma.budget.update({
    where: { id: budgetId },
    data:  { totalCost: 0 },
  });

  return {
    message:      `${count} item(ns) removido(s)`,
    budgetTotalCost: 0,
  };
}