import { Router }    from "express";
import passport      from "passport";
import { authorize } from "../../middlewares/authorize.js";
import { list, getOne, create, update,
  changeStatus, clone, remove } from "./budgets.controller.js";

const router = Router({ mergeParams: true }); // herda :projectId
const jwt = passport.authenticate("jwt", { session: false });

router.get("/",             jwt,                                  list);
router.post("/",            jwt, authorize("ADMIN","ENGINEER"),   create);
router.get("/:id",          jwt,                                  getOne);
router.patch("/:id",        jwt, authorize("ADMIN","ENGINEER"),   update);
router.patch("/:id/status", jwt, authorize("ADMIN","ENGINEER"),   changeStatus);
router.post("/:id/clone",   jwt, authorize("ADMIN","ENGINEER"),   clone);
router.delete("/:id",       jwt, authorize("ADMIN"),              remove);

export default router;