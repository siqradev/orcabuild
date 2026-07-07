import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES  = ['/login']
const IGNORED_PREFIX = ['/_next', '/favicon', '/api/auth']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (IGNORED_PREFIX.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token    = request.cookies.get('orcabuild_token')?.value
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  if (!isPublic && !token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (isPublic && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
