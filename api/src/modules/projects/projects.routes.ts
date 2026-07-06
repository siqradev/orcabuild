// src/modules/projects/projects.routes.ts

import { Router }   from "express";
import passport     from "passport";
import { authorize } from "../../middlewares/authorize.js";
import { list, getOne, create, update, remove } from "./projects.controller.js";

const router = Router();

// Atalho: todas as rotas deste arquivo exigem autenticação JWT
const jwt = passport.authenticate("jwt", { session: false });

router.get("/",jwt,list);
router.get("/:id",jwt,getOne);
router.post("/", jwt, authorize("ADMIN", "ENGINEER"),create);
router.patch("/:id", jwt, authorize("ADMIN", "ENGINEER"),update);
router.delete("/:id", jwt, authorize("ADMIN"),remove);

export default router;