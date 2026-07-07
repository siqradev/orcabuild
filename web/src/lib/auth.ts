import type { User } from '@/types/budget.types'

const USER_KEY = 'orcabuild_user'

// Token agora fica em cookie HttpOnly (gerenciado pelo servidor)
// Aqui só guardamos os dados do usuário para exibição na UI
export const authStorage = {
  getUser(): User | null {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  },

  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  clear(): void {
    localStorage.removeItem(USER_KEY)
  },
}
