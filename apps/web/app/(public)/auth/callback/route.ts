export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase Auth callback handler.
 *
 * Supabase redirects here after:
 * - OAuth provider sign-in (Google, GitHub, …)
 * - Email confirmation / magic link
 *
 * We exchange the one-time `code` for a session, then redirect the user to
 * their intended destination (defaulting to /home).
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/home'

  // Guard against open redirects — only allow relative paths.
  const safeNext = next.startsWith('/') ? next : '/home'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
      const errorUrl = new URL('/login', request.url)
      errorUrl.searchParams.set('error', 'auth_callback_failed')
      return NextResponse.redirect(errorUrl)
    }
  }

  return NextResponse.redirect(new URL(safeNext, request.url))
}
