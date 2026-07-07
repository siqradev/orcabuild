import { Router }              from "express";
import passport                from "passport";
import { register, login, me } from "./auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login",    login);

router.get(
  "/me",
  passport.authenticate("jwt", { session: false }),
  me
);

export default router;
