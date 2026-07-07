import { NotFoundError } from "../errors/HttpErrors.js";
import type { Request, Response, NextFunction } from "express";

export function notFound(req:Request, _res:Response, next:NextFunction ) {
  next(new NotFoundError(`Rota ${req.method} ${req.path}`));
}

// Resultado para qualquer rota inexistente:
// { "error": { "message": "Rota GET /xpto nao encontrado", "code": "NOT_FOUND" } }
