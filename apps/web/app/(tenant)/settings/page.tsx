import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ProfileForm } from '../profile/profile-form'

export const metadata: Metadata = { title: 'Settings' }

interface MemberProfile {
  id: string
  displayName: string
  username: string | null
  bio: string | null
  avatarUrl: string | null
  role: string
  socialHandles?: Record<string, string>
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const token = session.access_token

  let profile: MemberProfile | null = null
  try {
    profile = await apiGet<MemberProfile>('/api/me', token, 60)
  } catch { /* fall through */ }

  if (!profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load settings. Please try refreshing.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and profile</p>
      </div>

      {/* Profile section */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 text-base font-semibold text-surface-foreground">Profile</h2>
        <ProfileForm
          token={token}
          initialValues={{
            displayName: profile.displayName,
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            ...(profile.socialHandles ? { socialHandles: profile.socialHandles } : {}),
          }}
        />
      </section>

      {/* Account section */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 text-base font-semibold text-surface-foreground">Account</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Email and password are managed through your identity provider.
        </p>
        <div className="rounded-lg bg-muted border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium text-surface-foreground">{session.user.email}</p>
        </div>
      </section>
    </div>
  )
}
