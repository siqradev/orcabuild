import "dotenv/config";
import "dotenv/config";
// Roda uma vez antes de todos os testes
import { execSync } from "child_process";
import { prisma }   from "../lib/prisma.js";

// Aponta para o banco de teste
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST!;

beforeAll(async () => {
  // Aplica as migrations no banco de teste
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST! }
  });
});

// Limpa todas as tabelas entre os testes (ordem respeita FKs)
beforeEach(async () => {
  await prisma.budgetItem.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});