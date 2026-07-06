import type { Request, Response } from "express";
import { createProjectSchema, updateProjectSchema,
         projectIdSchema, listProjectsSchema } from "./projects.schemas.js";
import { listProjects, getProjectById, createProject,
         updateProject, deleteProject } from "./projects.service.js";

function errorStatus(message: string): number {
  if (message.includes("não encontrado")) return 404;
  if (message.includes("negado"))         return 403;
  return 500;
}

// GET /projects
export async function list(req: Request, res: Response) {
  const query = listProjectsSchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Query inválida", details: query.error.flatten().fieldErrors });
    return;
  }
  try {
    res.json(await listProjects(req.user!.id, req.user!.role, query.data));
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar projetos" });
  }
}

// GET /projects/:id
export async function getOne(req: Request, res: Response) {
  const params = projectIdSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    res.json(await getProjectById(params.data.id, req.user!.id, req.user!.role));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// POST /projects
export async function create(req: Request, res: Response) {
  const body = createProjectSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.status(201).json(await createProject(req.user!.id, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err); console.error("CREATE PROJECT ERROR:", msg); res.status(500).json({ error: msg });
  }
}

// PATCH /projects/:id
export async function update(req: Request, res: Response) {
  const params = projectIdSchema.safeParse(req.params);
  const body   = updateProjectSchema.safeParse(req.body);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos", details: body.error.flatten().fieldErrors });
    return;
  }
  try {
    res.json(await updateProject(params.data.id, req.user!.id, req.user!.role, body.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}

// DELETE /projects/:id
export async function remove(req: Request, res: Response) {
  const params = projectIdSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    res.json(await deleteProject(params.data.id, req.user!.id, req.user!.role));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    res.status(errorStatus(msg)).json({ error: msg });
  }
}
