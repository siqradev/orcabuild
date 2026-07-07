import express          from "express";
import cors             from "cors";
import rateLimit        from "express-rate-limit";
import passportConfig   from "./middlewares/passport.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { notFound }     from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes        from "./modules/auth/auth.routes.js";
import projectRoutes     from "./modules/projects/projects.routes.js";
import budgetRoutes      from "./modules/budgets/budgets.routes.js";
import budgetItemRoutes  from "./modules/budget-items/budget-items.routes.js";
import sinapiRoutes      from "./modules/sinapi/sinapi.routes.js";
import priceTablesRoutes from "./modules/price-tables/price-tables.routes.js"; // ← NOVO
import quotationsRoutes  from "./modules/quotations/quotations.routes.js";     // ← NOVO
import compositionsRoutes from "./modules/compositions/compositions.routes.js"; // ← NOVO


export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  if (process.env.NODE_ENV !== 'test') {
    app.use(rateLimit({ windowMs: 15*60*1000, max: 100,
      standardHeaders: true, legacyHeaders: false }));
  }

  app.use(passportConfig.initialize());

  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  app.use("/auth",                              authRoutes);
  app.use("/projects",                          projectRoutes);
  app.use("/projects/:projectId/budgets",       budgetRoutes);
  app.use("/budgets",                           budgetRoutes);
  app.use("/budgets/:budgetId/items",           budgetItemRoutes);
  app.use("/items",                             budgetItemRoutes);
  app.use("/sinapi",                            sinapiRoutes);
  app.use("/budgets/:budgetId/sinapi",          sinapiRoutes);
  app.use("/price-tables",                      priceTablesRoutes); // ← NOVO
  app.use("/quotations",                        quotationsRoutes);  // ← NOVO
  app.use("/compositions",                     compositionsRoutes); // ← NOVO

  
  app.get("/", (_req, res) => res.json({ status: "ok", version: "1.0.0" }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
