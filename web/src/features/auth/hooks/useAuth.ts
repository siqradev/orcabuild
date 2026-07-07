'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter }    from 'next/navigation'
import { authService }  from '@/services/api/auth'
import { authStorage }  from '@/lib/auth'
import type { User, LoginInput } from '@/types/budget.types'

export function useAuth() {
  const router = useRouter()
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    const stored = authStorage.getUser()
    if (stored) setUser(stored)
  }, [])

  const login = useCallback(async (data: LoginInput) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.login(data)
      setUser(res.user)
      router.push('/dashboard')
    } catch {
      setError('E-mail ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }, [router])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  return { user, loading, error, login, logout }
}
