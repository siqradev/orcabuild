// src/modules/compositions/compositions.service.ts

import {
  getCompositionDetail as etlGetCompositionDetail,
  addCompositionInsumo as etlAddCompositionInsumo,
  removeCompositionInsumo as etlRemoveCompositionInsumo,
  updateCompositionPricing as etlUpdateCompositionPricing,
  listCompositions as etlListCompositions,
} from "../../lib/etl-client.js";

import type { AddInsumoInput, UpdatePricingInput } from "./compositions.schemas.js";

export async function getCompositionDetail(code: string, tableId: string) {
  return etlGetCompositionDetail(code, tableId);
}

export async function addInsumo(
  code: string,
  input: AddInsumoInput,
  userId: string,
  userName: string
) {
  return etlAddCompositionInsumo(code, {
    ...input,
    createdByUserId: userId,
    createdByName: userName,
  });
}

export async function removeInsumo(compositionId: string) {
  return etlRemoveCompositionInsumo(compositionId);
}

export async function updatePricing(code: string, input: UpdatePricingInput) {
  return etlUpdateCompositionPricing(code, input);
}

export async function listCompositions(tableId: string, q?: string) {
  return etlListCompositions(tableId, q);
}