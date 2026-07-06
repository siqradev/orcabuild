// src/modules/quotations/quotations.service.ts
import {
  createQuotation as etlCreateQuotation,
  listQuotations as etlListQuotations,
  searchQuotations as etlSearchQuotations,
  getQuotation as etlGetQuotation,
  addQuote as etlAddQuote,
  removeQuote as etlRemoveQuote,
  approveQuotation as etlApproveQuotation,
  createPendingItem as etlCreatePendingItem,
} from "../../lib/etl-client.js";
import type {
  CreateQuotationInput,
  AddQuoteInput,
  ApproveQuotationInput,
  CreatePendingItemInput,
} from "./quotations.schemas.js";

export async function createQuotation(
  input: CreateQuotationInput,
  userId: string,
  userName: string
) {
  return etlCreateQuotation({
    description: input.description,
    unit: input.unit,
    createdByUserId: userId,
    createdByName: userName,
  });
}

export async function listQuotations(status?: string) {
  return etlListQuotations(status);
}

export async function searchQuotations(query: string) {
  return etlSearchQuotations(query);
}

export async function getQuotation(id: string) {
  return etlGetQuotation(id);
}

export async function addQuote(quotationId: string, input: AddQuoteInput) {
  return etlAddQuote(quotationId, input);
}

export async function removeQuote(quoteId: string) {
  return etlRemoveQuote(quoteId);
}

export async function approveQuotation(
  quotationId: string,
  input: ApproveQuotationInput
) {
  return etlApproveQuotation(quotationId, input);
}

export async function createPendingItem(quotationId: string, input: CreatePendingItemInput) {
  return etlCreatePendingItem({ quotationId, ...input });
}