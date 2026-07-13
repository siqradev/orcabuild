// src/modules/purchase-requests/purchase-requests.service.ts

import { prisma } from "../../lib/prisma.js";
import type {
  CreatePurchaseRequestInput,
  AddSupplierQuoteInput,
  ApproveItemsInput,
} from "./purchase-requests.schemas.js";

// ── Criar Solicitação de Compra ───────────────────────────────────────────────
export async function createPurchaseRequest(
  input: CreatePurchaseRequestInput,
  userId: string
) {
  // Busca os itens do orçamento para pegar descrição, unidade e preço
  const budgetItems = await prisma.budgetItem.findMany({
    where: {
      id: { in: input.items.map(i => i.budgetItemId) },
      budgetId: input.budgetId,
    },
  });

  if (budgetItems.length !== input.items.length) {
    throw new Error("Um ou mais itens não pertencem a este orçamento");
  }

  const request = await prisma.purchaseRequest.create({
    data: {
      budgetId:    input.budgetId,
      title:       input.title,
      createdById: userId,
      items: {
        create: input.items.map(i => {
          const budgetItem = budgetItems.find(b => b.id === i.budgetItemId)!;
          return {
            budgetItemId:      i.budgetItemId,
            description:       budgetItem.description,
            unit:              budgetItem.unit,
            quantityRequested: i.quantityRequested,
            budgetUnitPrice:   budgetItem.unitPrice,
          };
        }),
      },
    },
    include: {
      items:  true,
      quotes: { include: { items: true } },
    },
  });

  return request;
}

// ── Listar Solicitações de Compra ─────────────────────────────────────────────
export async function listPurchaseRequests(budgetId?: string) {
  return prisma.purchaseRequest.findMany({
    where: budgetId ? { budgetId } : undefined,
    include: {
      budget:  { select: { title: true, project: { select: { name: true } } } },
      creator: { select: { name: true } },
      items:   { select: { id: true } },
      quotes:  { select: { id: true } },
      orders:  { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Buscar Solicitação por ID ──────────────────────────────────────────────────
export async function getPurchaseRequest(id: string) {
  const request = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: {
      budget:  { select: { title: true, project: { select: { name: true } } } },
      creator: { select: { name: true } },
      items: {
        include: {
          budgetItem: { select: { notes: true } },
          quoteItems: { include: { supplierQuote: { select: { supplierName: true } } } },
          orderItems: { select: { quantity: true, unitPrice: true } },
        },
      },
      quotes: {
        include: {
          items: {
            include: {
              purchaseRequestItem: { select: { description: true, unit: true, budgetUnitPrice: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      orders: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!request) throw new Error("Solicitação de compra não encontrada");
  return request;
}

// ── Adicionar Cotação de Fornecedor ───────────────────────────────────────────
export async function addSupplierQuote(
  purchaseRequestId: string,
  input: AddSupplierQuoteInput
) {
  const request = await prisma.purchaseRequest.findUnique({
    where: { id: purchaseRequestId },
  });
  if (!request) throw new Error("Solicitação não encontrada");
  if (request.status === "ORDERED") {
    throw new Error("Não é possível adicionar cotações após os pedidos serem emitidos");
  }

  const quote = await prisma.supplierQuote.create({
    data: {
      purchaseRequestId,
      supplierName:    input.supplierName,
      supplierContact: input.supplierContact,
      validUntil:      new Date(input.validUntil),
      notes:           input.notes,
      items: {
        create: input.items.map(i => ({
          purchaseRequestItemId: i.purchaseRequestItemId,
          unitPrice:             i.unitPrice,
          notes:                 i.notes,
        })),
      },
    },
    include: { items: true },
  });

  // Atualiza status para QUOTED se ainda estava em SENT ou DRAFT
  if (request.status === "DRAFT" || request.status === "SENT") {
    await prisma.purchaseRequest.update({
      where: { id: purchaseRequestId },
      data:  { status: "QUOTED" },
    });
  }

  return quote;
}

// ── Remover Cotação de Fornecedor ─────────────────────────────────────────────
export async function removeSupplierQuote(quoteId: string) {
  await prisma.supplierQuote.delete({ where: { id: quoteId } });
}

// ── Aprovar itens por fornecedor e gerar Pedidos de Compra ───────────────────
export async function approveAndGenerateOrders(
  purchaseRequestId: string,
  input: ApproveItemsInput
) {
  const request = await prisma.purchaseRequest.findUnique({
    where: { id: purchaseRequestId },
    include: { items: true, quotes: { include: { items: true } } },
  });
  if (!request) throw new Error("Solicitação não encontrada");

  // Agrupa aprovações por fornecedor
  const bySupplier = new Map<string, typeof input.approvals>();
  for (const approval of input.approvals) {
    const existing = bySupplier.get(approval.supplierQuoteId) ?? [];
    existing.push(approval);
    bySupplier.set(approval.supplierQuoteId, existing);
  }

  const orders = await prisma.$transaction(async (tx) => {
    const created = [];

    for (const [supplierQuoteId, approvals] of bySupplier) {
      const quote = request.quotes.find(q => q.id === supplierQuoteId);
      if (!quote) throw new Error(`Cotação ${supplierQuoteId} não encontrada`);

      // Calcula total do pedido
      let totalAmount = 0;
      const orderItems = approvals.map(approval => {
        const quoteItem = quote.items.find(qi => qi.purchaseRequestItemId === approval.purchaseRequestItemId);
        if (!quoteItem) throw new Error("Item não encontrado na cotação");
        const unitPrice  = Number(quoteItem.unitPrice);
        const totalPrice = unitPrice * approval.quantity;
        totalAmount += totalPrice;
        return {
          purchaseRequestItemId: approval.purchaseRequestItemId,
          quantity:   approval.quantity,
          unitPrice,
          totalPrice,
        };
      });

      const order = await tx.purchaseOrder.create({
        data: {
          purchaseRequestId,
          supplierQuoteId,
          supplierName:  quote.supplierName,
          totalAmount,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Atualiza quantityOrdered nos itens da solicitação
      for (const approval of approvals) {
        const reqItem = request.items.find(i => i.id === approval.purchaseRequestItemId);
        if (reqItem) {
          await tx.purchaseRequestItem.update({
            where: { id: approval.purchaseRequestItemId },
            data: {
              quantityOrdered: {
                increment: approval.quantity,
              },
            },
          });
        }
      }

      created.push(order);
    }

    // Atualiza status da solicitação
    await tx.purchaseRequest.update({
      where: { id: purchaseRequestId },
      data:  { status: "ORDERED" },
    });

    return created;
  });

  return { orders, count: orders.length };
}

// ── Mapa Comparativo ──────────────────────────────────────────────────────────
export async function getComparativeMap(purchaseRequestId: string) {
  const request = await prisma.purchaseRequest.findUnique({
    where: { id: purchaseRequestId },
    include: {
      items: true,
      quotes: {
        include: { items: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!request) throw new Error("Solicitação não encontrada");

  const map = request.items.map(item => {
    const quotePrices = request.quotes.map(quote => {
      const quoteItem = quote.items.find(qi => qi.purchaseRequestItemId === item.id);
      return {
        supplierQuoteId: quote.id,
        supplierName:    quote.supplierName,
        validUntil:      quote.validUntil,
        unitPrice:       quoteItem ? Number(quoteItem.unitPrice) : null,
        total:           quoteItem ? Number(quoteItem.unitPrice) * Number(item.quantityRequested) : null,
        diffFromBudget:  quoteItem
          ? ((Number(quoteItem.unitPrice) - Number(item.budgetUnitPrice)) / Number(item.budgetUnitPrice)) * 100
          : null,
      };
    });

    const validPrices = quotePrices.filter(q => q.unitPrice !== null);
    const bestPrice = validPrices.length > 0
      ? validPrices.reduce((a, b) => (a.unitPrice! < b.unitPrice! ? a : b))
      : null;

    return {
      item: {
        id:               item.id,
        description:      item.description,
        unit:             item.unit,
        quantityRequested: Number(item.quantityRequested),
        quantityOrdered:  Number(item.quantityOrdered),
        budgetUnitPrice:  Number(item.budgetUnitPrice),
        saldoQuantity:    Number(item.quantityRequested) - Number(item.quantityOrdered),
      },
      quotes:     quotePrices,
      bestQuote:  bestPrice,
    };
  });

  return {
    purchaseRequestId,
    title:     request.title,
    suppliers: request.quotes.map(q => ({ id: q.id, name: q.supplierName, validUntil: q.validUntil })),
    items:     map,
  };
}
