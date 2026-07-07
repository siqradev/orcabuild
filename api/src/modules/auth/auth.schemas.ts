import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),

  email: z
    .string()
    .email("E-mail inválido")
    .toLowerCase(),

  password: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(100, "Senha muito longa"),

  role: z
    .enum(["ADMIN", "ENGINEER", "CLIENT"])
    .optional()
    .default("ENGINEER"),
});

export const loginSchema = z.object({
  email:    z.string().email("E-mail inválido").toLowerCase(),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput    = z.infer<typeof loginSchema>;
