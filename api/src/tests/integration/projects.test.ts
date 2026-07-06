import { describe, it, expect } from "vitest";
import request                  from "supertest";
import { createApp }            from "../../app.js";
import { createTestUser, createTestProject } from "../helpers.js";

const app = createApp();

describe('POST /projects', () => {
  it('201 — cria projeto para ENGINEER autenticado', async () => {
    const { token } = await createTestUser({ email: 'eng@test.com' });
    const res = await request(app).post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Galpão Industrial', status: 'DRAFT' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Galpão Industrial');
  });

  it('403 — CLIENT não pode criar projeto', async () => {
    const { token } = await createTestUser({ email: 'c@test.com', role: 'CLIENT' });
    const res = await request(app).post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(403);
  });
});

describe('GET /projects', () => {
  it('ENGINEER só vê os próprios projetos', async () => {
    const { user: u1, token: t1 } = await createTestUser({ email: 'u1@test.com' });
    const { user: u2 }            = await createTestUser({ email: 'u2@test.com' });
    await createTestProject(u1.id, { name: 'Do U1' });
    await createTestProject(u2.id, { name: 'Do U2' });
    const res = await request(app).get('/projects')
      .set('Authorization', `Bearer ${t1}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Do U1');
  });

  it('ADMIN vê todos os projetos', async () => {
    const { user: u1 }      = await createTestUser({ email: 'a1@test.com' });
    const { user: u2 }      = await createTestUser({ email: 'a2@test.com' });
    const { token: tAdmin } = await createTestUser({ email: 'adm@test.com', role: 'ADMIN' });
    await createTestProject(u1.id);
    await createTestProject(u2.id);
    const res = await request(app).get('/projects')
      .set('Authorization', `Bearer ${tAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});