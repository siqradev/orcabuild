import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres"),

  description: z.string().max(2000).optional(),

  location: z
    .string()
    .max(300, "Localização deve ter no máximo 300 caracteres")
    .optional(),

  status: z
    .enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"])
    .optional()
    .default("DRAFT"),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .omit({ status: true })
  .extend({
    status: z
      .enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"])
      .optional(),
  });

export const projectIdSchema = z.object({
  id: z.string().uuid("ID inválido"),
});

export const listProjectsSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery  = z.infer<typeof listProjectsSchema>;
