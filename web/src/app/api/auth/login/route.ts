import { NextRequest, NextResponse } from 'next/server'

const BUDGET_API = process.env.BUDGET_API_URL ?? 'http://localhost:3002'
const IS_PROD    = process.env.NODE_ENV === 'production'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 dias em segundos

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Chama a budget-api internamente (servidor → servidor)
    const res = await fetch(`${BUDGET_API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? 'Credenciais inválidas' },
        { status: res.status }
      )
    }

    // Monta resposta sem expor o token no body
    const response = NextResponse.json({
      user: data.user,
      message: data.message,
    })

    // Seta cookie HttpOnly — JavaScript não consegue ler
    response.cookies.set('orcabuild_token', data.token, {
      httpOnly: true,
      secure:   IS_PROD,       // HTTPS em produção, HTTP em dev
      sameSite: 'strict',
      maxAge:   COOKIE_MAX_AGE,
      path:     '/',
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Erro interno — tente novamente' },
      { status: 500 }
    )
  }
}
