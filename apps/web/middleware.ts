import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Next.js middleware — runs on every matched request at the edge.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session (rotate access token cookie) on every request
 *    so that short-lived tokens stay alive during active browsing.
 * 2. Redirect unauthenticated users attempting to access tenant routes to /login.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Paths that never require authentication ────────────────────────────────
  const publicPrefixes = ['/', '/login', '/signup', '/auth', '/setup']
  const isPublic =
    pathname === '/' ||
    publicPrefixes.some((p) => p !== '/' && pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')

  // Create a mutable response so we can write refreshed cookies back.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // Write cookies to both the outgoing request and response so
          // downstream Server Components see the refreshed token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            if (options) {
              response.cookies.set(name, value, options as NonNullable<Parameters<typeof response.cookies.set>[2]>)
            } else {
              response.cookies.set(name, value)
            }
          })
        },
      },
    },
  )

  // Always call getUser() to refresh the session cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Auth guard for tenant/protected routes ─────────────────────────────────
  if (!isPublic && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Redirect already-authenticated users away from auth/marketing pages ────
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static assets)
     * - _next/image  (image optimisation endpoint)
     * - favicon.ico
     * - Public file extensions served from /public
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
