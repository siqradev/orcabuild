import { describe, it, expect }  from "vitest";
import request                   from "supertest";
import { createApp }             from "../../app.js";
import { createTestUser }        from "../helpers.js";

const app = createApp();

describe("POST /auth/register", () => {
  it("201 — cria usuário e retorna token", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Leandro", email: "reg@test.com", password: "senha123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("reg@test.com");
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("409 — rejeita e-mail duplicado", async () => {
    await createTestUser({ email: "dup@test.com" });

    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Outro", email: "dup@test.com", password: "senha123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
  });

  it("400 — rejeita e-mail inválido", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "X", email: "nao-e-email", password: "123" });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("200 — retorna token com credenciais corretas", async () => {
    await createTestUser({ email: "login@test.com", password: "senha123" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@test.com", password: "senha123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("401 — rejeita senha errada", async () => {
    await createTestUser({ email: "login2@test.com", password: "certa" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login2@test.com", password: "errada" });

    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("200 — retorna dados do usuário autenticado", async () => {
    const { token } = await createTestUser({ email: "me@test.com" });

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("me@test.com");
  });

  it("401 — bloqueia sem token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });
});
