import bcrypt     from "bcryptjs";
import jwt        from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

// Cria usuário + token JWT para testes
export async function createTestUser(overrides?: {
  email?: string; password?: string; role?: 'ADMIN'|'ENGINEER'|'CLIENT';
}) {
  const password = overrides?.password ?? 'senha123';
  const hashed   = await bcrypt.hash(password, 4); // rounds baixo = teste rápido

  const user = await prisma.user.create({
    data: {
      name:     'Usuário Teste',
     email:    overrides?.email    ?? 'teste@orcabuild.com',
      password: hashed,
      role:     overrides?.role     ?? 'ENGINEER',
    }
  });

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return { user, token, password };
}

// Cria projeto de teste
export async function createTestProject(userId: string, overrides?: {
  name?: string; status?: 'DRAFT'|'ACTIVE'|'COMPLETED'|'CANCELLED';
}) {
  return prisma.project.create({
    data: {
      name:   overrides?.name   ?? 'Projeto Teste',
      status: overrides?.status ?? 'DRAFT',
      userId,
    }
  });
}

// Cria orçamento de teste
export async function createTestBudget(projectId: string, overrides?: {
  title?: string; status?: 'DRAFT'|'REVIEW'|'APPROVED'|'REJECTED'|'ARCHIVED';
}) {
  return prisma.budget.create({
    data: {
      title:     overrides?.title  ?? 'Orçamento Teste',
      status:    overrides?.status ?? 'DRAFT',
      version:   1,
      currency:  'BRL',
      projectId,
    }
  });
}