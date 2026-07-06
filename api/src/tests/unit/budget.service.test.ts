import { describe, it, expect } from "vitest";
import { createTestUser, createTestProject, createTestBudget } from "../helpers.js";
import { createBudget, updateBudgetStatus } from "../../modules/budgets/budgets.service.js";

describe('budgets — versionamento', () => {
  it('primeiro orçamento recebe versão 1', async () => {
    const { user } = await createTestUser();
    const project  = await createTestProject(user.id);
    const budget   = await createBudget(project.id, user.id, 'ENGINEER',
      { title: 'v1', currency: 'BRL' });
    expect(budget.version).toBe(1);
  });

  it('segundo orçamento recebe versão 2', async () => {
    const { user } = await createTestUser({ email: 'v2@test.com' });
    const project  = await createTestProject(user.id);
    await createBudget(project.id, user.id, 'ENGINEER', { title: 'v1', currency: 'BRL' });
    const b2 = await createBudget(project.id, user.id, 'ENGINEER', { title: 'v2', currency: 'BRL' });
    expect(b2.version).toBe(2);
  });
});

describe('budgets — transições de status', () => {
  it('DRAFT → REVIEW é válido', async () => {
    const { user } = await createTestUser({ email: 's1@test.com' });
    const project  = await createTestProject(user.id);
    const budget   = await createTestBudget(project.id);
    const updated  = await updateBudgetStatus(budget.id, user.id, 'ENGINEER',
      { status: 'REVIEW' });
    expect(updated.status).toBe('REVIEW');
  });

  it('DRAFT → APPROVED é inválido', async () => {
    const { user } = await createTestUser({ email: 's2@test.com' });
    const project  = await createTestProject(user.id);
    const budget   = await createTestBudget(project.id);
    await expect(
      updateBudgetStatus(budget.id, user.id, 'ENGINEER', { status: 'APPROVED' })
    ).rejects.toThrow('Transição inválida');
  });
});