// src/modules/budget-items/budget-items.routes.ts

import { Router }    from "express";
import passport      from "passport";
import { authorize } from "../../middlewares/authorize.js";
import {
  list, create, createBatch,
  update, reorder, remove, clear,
} from "./budget-items.controller.js";

const router = Router({ mergeParams: true }); // herda :budgetId da rota pai

const jwt = passport.authenticate("jwt", { session: false });

// Rotas aninhadas em /budgets/:budgetId/items
router.get("/",           jwt,                                  list);
router.post("/",          jwt, authorize("ADMIN", "ENGINEER"),  create);
router.post("/batch",     jwt, authorize("ADMIN", "ENGINEER"),  createBatch);
router.patch("/reorder",  jwt, authorize("ADMIN", "ENGINEER"),  reorder);
router.delete("/",        jwt, authorize("ADMIN"),              clear);

// Rotas diretas em /items/:id
router.patch("/:id",      jwt, authorize("ADMIN", "ENGINEER"),  update);
router.delete("/:id",     jwt, authorize("ADMIN", "ENGINEER"),  remove);

export default router;