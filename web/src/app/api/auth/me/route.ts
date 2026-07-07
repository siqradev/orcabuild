import { NextRequest, NextResponse } from 'next/server'

const BUDGET_API = process.env.BUDGET_API_URL ?? 'http://localhost:3002'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('orcabuild_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const res = await fetch(`${BUDGET_API}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
