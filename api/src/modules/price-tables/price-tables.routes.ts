import { Router }   from "express";
import passport      from "passport";
import { listPriceTables, listPriceTableItems } from "./price-tables.controller.js";

const router = Router();
const jwt    = passport.authenticate("jwt", { session: false });

router.get("/",      jwt, listPriceTables);
router.get("/items", jwt, listPriceTableItems);

export default router;