import type { Request, Response, NextFunction } from 'express'
import { AppError } from "../errors/AppError.js"
import { logger } from "../lib/logger.js"


const isDev = process.env.NODE_ENV !== 'production';

export function errorHandler(
  err: unknown, req:Request, res:Response, _next:NextFunction) {
  // Erros conhecidos — AppError e subclasses
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, { code: err.code, statusCode: err.statusCode });
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code,
               ...(isDev && { stack: err.stack }) }
    });
    return;
  }

  // Erros de validacao do Zod
  if (err instanceof Error && err.name === "ZodError") {
    res.status(400).json({
      error: { message: "Dados invalidos", code: "VALIDATION_ERROR" }
    });
    return;
  }

  // Erros inesperados — nunca vaza detalhes em producao
  logger.error("Erro inesperado!", {
     message: err instanceof Error ? err.message: String(err),
     path: req.path });
  
  res.status(500).json({
    error: {
      message: isDev && err instanceof Error ? err.message : "Erro interno do servidor",
      code: "INTERNAL_ERROR"
    }
  });
}
