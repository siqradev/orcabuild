import { NextRequest, NextResponse } from 'next/server'

const BUDGET_API = process.env.BUDGET_API_URL ?? 'http://localhost:3002'

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const token = request.cookies.get('orcabuild_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { path } = await params
  const search = request.nextUrl.search
  const url = `${BUDGET_API}/${path.join('/')}${search}`

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.text()
      : undefined

  const res = await fetch(url, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export const GET    = handler
export const POST   = handler
export const PUT    = handler
export const DELETE = handler
export const PATCH  = handler
