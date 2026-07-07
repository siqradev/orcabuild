import { logger } from "../lib/logger.js";
import type { Request, Response, NextFunction } from "express";

export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Escolhe o nivel pelo statusCode
    const level = res.statusCode >= 500 ? "error"
                : res.statusCode >= 400 ? "warn"
                : "info";

    logger[level](`${req.method} ${req.path}`, {
      status:     res.statusCode,
      durationMs: duration,
      ip:         req.ip,
    });
  });

  next();
}
