// src/modules/quotations/quotations.routes.ts

import { Router }    from "express";
import passport      from "passport";
import { authorize } from "../../middlewares/authorize.js";
import {
  create,
  list,
  search,
  getOne,
  addQuoteToQuotation,
  removeQuoteFromQuotation,
  approve,
  createPendingItemHandler,
} from "./quotations.controller.js";

const router = Router();
const jwt = passport.authenticate("jwt", { session: false });

// GET /quotations/search?q=tubo  — autocomplete (precisa vir antes de /:id)
router.get("/search", jwt, search);

// GET /quotations?status=OPEN
router.get("/", jwt, list);

// POST /quotations
router.post("/", jwt, authorize("ADMIN", "ENGINEER"), create);

// GET /quotations/:id
router.get("/:id", jwt, getOne);

// POST /quotations/:id/quotes
router.post("/:id/quotes", jwt, authorize("ADMIN", "ENGINEER"), addQuoteToQuotation);

// POST /quotations/:id/pending-item
router.post("/:id/pending-item", jwt, authorize("ADMIN", "ENGINEER"), createPendingItemHandler);

// DELETE /quotations/quotes/:quoteId
router.delete("/quotes/:quoteId", jwt, authorize("ADMIN", "ENGINEER"), removeQuoteFromQuotation);

// POST /quotations/:id/approve
router.post("/:id/approve", jwt, authorize("ADMIN", "ENGINEER"), approve);

export default router;
