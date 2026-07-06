import { describe, it, expect } from "vitest";
import { registerUser, loginUser } from "../../modules/auth/auth.service.js";
import { createTestUser }          from "../helpers.js";

describe('auth.service — registerUser', () => {
  it('cria usuário com senha hasheada', async () => {
    const result = await registerUser({
      name: 'Leandro', email: 'leandro@test.com',
      password: 'senha123', role: 'ENGINEER',
    });
    expect(result.user.email).toBe('leandro@test.com');
    expect(result.user).not.toHaveProperty('password');
    expect(result.token).toBeTruthy();
  });

  it('rejeita e-mail duplicado', async () => {
    await createTestUser({ email: 'dup@test.com' });
    await expect(registerUser({
      name: 'Outro', email: 'dup@test.com',
      password: 'senha123', role: 'ENGINEER',
    })).rejects.toThrow('E-mail já cadastrado');
  });
});

describe('auth.service — loginUser', () => {
  it('retorna token com credenciais corretas', async () => {
    await createTestUser({ email: 'login@test.com', password: 'certa' });
    const result = await loginUser({ email: 'login@test.com', password: 'certa' });
    expect(result.token).toBeTruthy();
  });

  it('rejeita senha incorreta', async () => {
    await createTestUser({ email: 'login2@test.com', password: 'certa' });
    await expect(
      loginUser({ email: 'login2@test.com', password: 'errada' })
    ).rejects.toThrow('Credenciais inválidas');
  });
});