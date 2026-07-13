// src/modules/purchase-requests/purchase-requests.routes.ts

import { Router }    from "express";
import passport      from "passport";
import { authorize } from "../../middlewares/authorize.js";
import {
  create,
  list,
  getOne,
  comparativeMap,
  addQuote,
  removeQuote,
  approve,
} from "./purchase-requests.controller.js";

const router = Router();
const jwt = passport.authenticate("jwt", { session: false });

// GET  /purchase-requests?budgetId=<uuid>
router.get("/",                          jwt, list);

// POST /purchase-requests
router.post("/",                         jwt, authorize("ADMIN", "ENGINEER"), create);

// GET  /purchase-requests/:id
router.get("/:id",                       jwt, getOne);

// GET  /purchase-requests/:id/map — mapa comparativo de fornecedores
router.get("/:id/map",                   jwt, comparativeMap);

// POST /purchase-requests/:id/quotes — adicionar cotação de fornecedor
router.post("/:id/quotes",               jwt, authorize("ADMIN", "ENGINEER"), addQuote);

// DELETE /purchase-requests/quotes/:quoteId
router.delete("/quotes/:quoteId",        jwt, authorize("ADMIN", "ENGINEER"), removeQuote);

// POST /purchase-requests/:id/approve — aprovar vencedores e gerar pedidos de compra
router.post("/:id/approve",              jwt, authorize("ADMIN", "ENGINEER"), approve);

export default router;
