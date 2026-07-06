// src/middlewares/authorize.ts

import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../generated/client.js";

export const authorize = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user){
            res.status(401).json({ error: 'Não autenticado' })
            return;
        }

        if (!allowedRoles.includes ( req.user.role )) {
            res.status(403).json({
                error: "Acesso negado",
                message: `Esta ação requer um dos seguintes papéis: ${ allowedRoles.join(",")}`,
            })
            return
        }
        next()
    }
    

}