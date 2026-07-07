// src/modules/budgets/budgets.service.ts

import { prisma }  from "../../lib/prisma.js";
import type { UserRole } from "../../generated/client.js";
import type {
  CreateBudgetInput,
  UpdateBudgetInput,
  UpdateBudgetStatusInput,
  ListBudgetsQuery,
} from "./budgets.schemas.js";
import { VALID_TRANSITIONS } from "./budgets.schemas.js";

// Helpers internos

async function assertProjectAccess(
  projectId: string,
  userId: string,
  userRole: UserRole
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) throw new Error("Projeto não encontrado");

  if (userRole !== "ADMIN" && project.userId !== userId) {
    throw new Error("Acesso negado");
  }

  return project;
}

async function assertBudgetAccess(
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

  return budget;
}

/**
 * Recalcula e persiste o totalCost somando todos os itens.
 * Exportada para ser chamada pelo módulo de itens (Aula 06).
 */
export async function recalculateBudgetTotal(budgetId: string) {
  const items = await prisma.budgetItem.findMany({
    where:  { budgetId },
    select: { totalPrice: true },
  });

  const total = items.reduce(
    (sum, item) => sum + Number(item.totalPrice),
    0
  );

  await prisma.budget.update({
    where: { id: budgetId },
    data:  { totalCost: total },
  });

  return total;
}

// ─────────────────────────────────────────────
// Listar orçamentos de um projeto
// ─────────────────────────────────────────────
export async function listBudgets(
  projectId: string,
  userId: string,
  userRole: UserRole,
  query: ListBudgetsQuery
) {
  await assertProjectAccess(projectId, userId, userRole);

  const { status, page, limit } = query;
  const skip = (page - 1) * limit;

  const where = {
    projectId,
    ...(status && { status }),
  };

  const [total, budgets] = await Promise.all([
    prisma.budget.count({ where }),
    prisma.budget.findMany({
      where,
      skip,
      take:    limit,
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { items: true } } },
    }),
  ]);

  return {
    data: budgets,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ─────────────────────────────────────────────
// Buscar orçamento por ID (com itens)
// ─────────────────────────────────────────────
export async function getBudgetById(
  budgetId: string,
  userId: string,
  userRole: UserRole
) {
  await assertBudgetAccess(budgetId, userId, userRole);

  return prisma.budget.findUnique({
    where:   { id: budgetId },
    include: {
      project: { select: { id: true, name: true } },
      items:   { orderBy: { sortOrder: "asc" } },
    },
  });
}

// ─────────────────────────────────────────────
// Criar orçamento
// ─────────────────────────────────────────────
export async function createBudget(
  projectId: string,
  userId: string,
  userRole: UserRole,
  data: CreateBudgetInput
) {
  await assertProjectAccess(projectId, userId, userRole);

  // Determina o próximo número de versão para este projeto
  const lastBudget = await prisma.budget.findFirst({
    where:   { projectId },
    orderBy: { version: "desc" },
    select:  { version: true },
  });

  const nextVersion = (lastBudget?.version ?? 0) + 1;

  return prisma.budget.create({
    data: { ...data, projectId, version: nextVersion },
    include: {
      project: { select: { id: true, name: true } },
    },
  });
}

// ─────────────────────────────────────────────
// Atualizar orçamento
// ─────────────────────────────────────────────
export async function updateBudget(
  budgetId: string,
  userId: string,
  userRole: UserRole,
  data: UpdateBudgetInput
) {
  const budget = await assertBudgetAccess(budgetId, userId, userRole);

  if (budget.status === "APPROVED" || budget.status === "ARCHIVED") {
    throw new Error(
      `Orçamentos com status "${budget.status}" não podem ser editados. ` +
      `Crie uma nova versão ou altere o status primeiro.`
    );
  }

  return prisma.budget.update({
    where:   { id: budgetId },
    data,
    include: { project: { select: { id: true, name: true } } },
  });
}

// ─────────────────────────────────────────────
// Atualizar status com validação de transição
// ─────────────────────────────────────────────
export async function updateBudgetStatus(
  budgetId: string,
  userId: string,
  userRole: UserRole,
  data: UpdateBudgetStatusInput
) {
  const budget = await assertBudgetAccess(budgetId, userId, userRole);

  const allowedNext = VALID_TRANSITIONS[budget.status] ?? [];

  if (!allowedNext.includes(data.status)) {
    throw new Error(
      `Transição inválida: "${budget.status}" → "${data.status}". ` +
      `Permitidas: ${allowedNext.length ? allowedNext.join(", ") : "nenhuma (estado final)"}`
    );
  }

  return prisma.budget.update({
    where: { id: budgetId },
    data:  { status: data.status },
  });
}

// ─────────────────────────────────────────────
// Criar nova versão (clone)
// ─────────────────────────────────────────────
export async function cloneBudget(
  budgetId: string,
  userId: string,
  userRole: UserRole
) {
  const original = await assertBudgetAccess(budgetId, userId, userRole);

  const originalItems = await prisma.budgetItem.findMany({
    where:   { budgetId },
    orderBy: { sortOrder: "asc" },
  });

  const lastBudget = await prisma.budget.findFirst({
    where:   { projectId: original.projectId },
    orderBy: { version: "desc" },
    select:  { version: true },
  });

  const nextVersion = (lastBudget?.version ?? 0) + 1;

  // Transação: ou tudo é criado, ou nada é — sem dados incompletos
  const cloned = await prisma.$transaction(async (tx) => {
    const newBudget = await tx.budget.create({
      data: {
        title:       `${original.title} (v${nextVersion})`,
        description: original.description ?? undefined,
        currency:    original.currency,
        status:      "DRAFT",
        version:     nextVersion,
        projectId:   original.projectId,
        totalCost:   original.totalCost,
      },
    });

    if (originalItems.length > 0) {
      await tx.budgetItem.createMany({
        data: originalItems.map(
          ({ id: _id, budgetId: _bid, createdAt: _c, updatedAt: _u, ...item }) => ({
            ...item,
            budgetId: newBudget.id,
          })
        ),
      });
    }

    return newBudget;
  });

  return {
    message:    `Nova versão criada com sucesso (v${nextVersion})`,
    budget:     cloned,
    itemsCount: originalItems.length,
  };
}

// ─────────────────────────────────────────────
// Deletar orçamento
// ─────────────────────────────────────────────
export async function deleteBudget(
  budgetId: string,
  userId: string,
  userRole: UserRole
) {
  const budget = await assertBudgetAccess(budgetId, userId, userRole);

  if (budget.status === "APPROVED") {
    throw new Error(
      "Orçamentos aprovados não podem ser deletados. Arquive-o primeiro."
    );
  }

  await prisma.budget.delete({ where: { id: budgetId } });

  return { message: "Orçamento deletado com sucesso" };
}
