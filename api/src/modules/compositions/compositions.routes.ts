// src/modules/compositions/compositions.routes.ts

import { Router }    from "express";
import passport      from "passport";
import { authorize } from "../../middlewares/authorize.js";
import {
  getDetail,
  addInsumoToComposition,
  removeInsumoFromComposition,
  updateCompositionPricing,
  listCompositionsHandler,
} from "./compositions.controller.js";

const router = Router();
const jwt = passport.authenticate("jwt", { session: false });

// POST /compositions/create
router.post("/create", jwt, authorize("ADMIN", "ENGINEER"), async (req, res) => {
  const { createEmptyComposition } = await import("../../lib/etl-client.js")
  const { description, unit, priceTableId, createdByUserId, createdByName } = req.body
  if (!description || !unit || !priceTableId) {
    res.status(400).json({ error: 'description, unit e priceTableId são obrigatórios' })
    return
  }
  try {
    const result = await createEmptyComposition({ description, unit, priceTableId, createdByUserId, createdByName })
    res.status(201).json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    res.status(400).json({ error: msg })
  }
})
// GET /compositions?tableId=<uuid>&q=<opcional>
router.get("/", jwt, listCompositionsHandler);

// GET /compositions/:code/detail?tableId=<uuid>
router.get("/:code/detail", jwt, getDetail);
// GET /compositions/:code/detail?tableId=<uuid>
router.get("/:code/detail", jwt, getDetail);

// POST /compositions/:code/insumos
router.post("/:code/insumos", jwt, authorize("ADMIN", "ENGINEER"), addInsumoToComposition);

// DELETE /compositions/insumos/:compositionId
router.delete("/insumos/:compositionId", jwt, authorize("ADMIN", "ENGINEER"), removeInsumoFromComposition);

// PATCH /compositions/:code/pricing
router.patch("/:code/pricing", jwt, authorize("ADMIN", "ENGINEER"), updateCompositionPricing);

export default router;
