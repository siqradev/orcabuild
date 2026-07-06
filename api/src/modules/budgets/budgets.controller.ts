import type { Request, Response } from "express";
import {
  createBudgetSchema,
  updateBudgetSchema,
  updateBudgetStatusSchema,
  budgetIdSchema,
  projectIdSchema,
  listBudgetsSchema,
} from "./budgets.schemas.js";
import {
  listBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  updateBudgetStatus,
  cloneBudget,
  deleteBudget,
} from "./budgets.service.js";

function errorStatus(msg: string) {
  if (msg.includes("não encontrado")) return 404;
  if (msg.includes("Acesso negado"))  return 403;
  if (msg.includes("inválida") || msg.includes("não podem")) return 422;
  return 500;
}

// GET /projects/:projectId/budgets
export async function list(req: Request, res: Response) {
  try {
    const { projectId } = projectIdSchema.parse(req.params);
    const query = listBudgetsSchema.parse(req.query);
    const result = await listBudgets(projectId, req.user!.id, req.user!.role, query);
    res.json(result);
  } catch (err: any) {
    res.status(errorStatus(err.message)).json({ error: err.message });
  }
}

// GET /budgets/:id
export async function getOne(req: Request, res: Response) {
  try {
    const { id } = budgetIdSchema.parse(req.params);
    const result = await getBudgetById(id, req.user!.id, req.user!.role);
    res.json(result);
  } catch (err: any) {
    res.status(errorStatus(err.message)).json({ error: err.message });
  }
}

// POST /projects/:projectId/budgets
export async function create(req: Request, res: Response) {
  try {
    const { projectId } = projectIdSchema.parse(req.params);
    const data = createBudgetSchema.parse(req.body);
    const result = await createBudget(projectId, req.user!.id, req.user!.role, data);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(errorStatus(err.message)).json({ error: err.message });
  }
}

// PATCH /budgets/:id
export async function update(req: Request, res: Response) {
  try {
    const { id } = budgetIdSchema.parse(req.params);
    const data = updateBudgetSchema.parse(req.body);
    const result = await updateBudget(id, req.user!.id, req.user!.role, data);
    res.json(result);
  } catch (err: any) {
    res.status(errorStatus(err.message)).json({ error: err.message });
  }
}

// PATCH /budgets/:id/status
export async function changeStatus(req: Request, res: Response) {
  try {
    const { id } = budgetIdSchema.parse(req.params);
    const data = updateBudgetStatusSchema.parse(req.body);
    const result = await updateBudgetStatus(id, req.user!.id, req.user!.role, data);
    res.json(result);
  } catch (err: any) {
    res.status(errorStatus(err.message)).json({ error: err.message });
  }
}

// POST /budgets/:id/clone
export async function clone(req: Request, res: Response) {
  try {
    const { id } = budgetIdSchema.parse(req.params);
    const result = await cloneBudget(id, req.user!.id, req.user!.role);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(errorStatus(err.message)).json({ error: err.message });
  }
}

// DELETE /budgets/:id
export async function remove(req: Request, res: Response) {
  try {
    const { id } = budgetIdSchema.parse(req.params);
    const result = await deleteBudget(id, req.user!.id, req.user!.role);
    res.json(result);
  } catch (err: any) {
    res.status(errorStatus(err.message)).json({ error: err.message });
  }
}
