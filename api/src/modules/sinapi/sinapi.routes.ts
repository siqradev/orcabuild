// src/modules/sinapi/sinapi.routes.ts

import { Router }    from "express";
import passport      from "passport";
import { authorize } from "../../middlewares/authorize.js";
import {
  search,
  addItem,
  addManyItems,
  status,
  addPendingQuotation,
  addEmptyComposition,
} from "./sinapi.controller.js";

const router = Router({ mergeParams: true });
const jwt = passport.authenticate("jwt", { session: false });

// Rotas de consulta ao catálogo (sem budgetId)
router.get("/search", jwt, search);
router.get("/status", jwt, status);

// Rotas de adição ao orçamento (com budgetId via rota pai)
router.post("/",                     jwt, authorize("ADMIN", "ENGINEER"), addItem);
router.post("/batch",                jwt, authorize("ADMIN", "ENGINEER"), addManyItems);
router.post("/pending-quotation",    jwt, authorize("ADMIN", "ENGINEER"), addPendingQuotation);
router.post("/empty-composition",    jwt, authorize("ADMIN", "ENGINEER"), addEmptyComposition);

export default router;
