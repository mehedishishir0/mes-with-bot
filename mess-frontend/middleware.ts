import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPrefixes = ['/dashboard', '/meals', '/expenses', '/settings', '/api']
const publicRoutes = ['/login', '/signup', '/', '/api/auth/login', '/api/auth/signup', '/api/auth/logout', '/api/auth/session']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicRoutes.includes(pathname) || pathname.startsWith('/_next') || pathname.includes('/favicon')) {
    return NextResponse.next()
  }

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  const session = request.cookies.get('messflow_session')?.value

  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
