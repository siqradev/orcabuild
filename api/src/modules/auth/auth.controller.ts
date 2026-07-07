import type { Request, Response } from "express";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import { registerUser, loginUser }     from "./auth.service.js";

// POST /auth/register
export async function register(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error:   "Dados inválidos",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const data = await registerUser(result.data);
    res.status(201).json({
      message: "Usuário criado com sucesso",
      ...data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao registrar";
    const status  = message === "E-mail já cadastrado" ? 409 : 500;
    res.status(status).json({ error: message });
  }
}

// POST /auth/login
export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error:   "Dados inválidos",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const data = await loginUser(result.data);
    res.json({
      message: "Login realizado com sucesso",
      ...data,
    });
  } catch (err) {
    res.status(401).json({ error: "Credenciais inválidas" });
  }
}

// GET /auth/me
export function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
