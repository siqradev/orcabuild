import { authStorage } from '@/lib/auth'
import type { AuthResponse, LoginInput, User } from '@/types/budget.types'

export const authService = {
  // Chama o Route Handler interno /api/auth/login
  // O handler seta o cookie HttpOnly — o token nunca passa pelo JavaScript
  async login(data: LoginInput): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })

    const json = await res.json()

    if (!res.ok) {
      throw new Error(json.error ?? 'Credenciais inválidas')
    }

    // Salva só os dados do usuário (não o token)
    authStorage.setUser(json.user)
    return json
  },

  // Chama o Route Handler interno /api/auth/logout
  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' })
    authStorage.clear()
    window.location.href = '/login'
  },

  // Chama o Route Handler interno /api/auth/me
  async me(): Promise<User> {
    const res  = await fetch('/api/auth/me')
    const json = await res.json()
    if (!res.ok) throw new Error('Não autenticado')
    return json.user
  },
}
