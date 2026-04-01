import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = { title: 'Profile' }

interface MemberProfile {
  id: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  role: string
  createdAt: string
}

function joinedDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(iso))
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const token = session.access_token

  let profile: MemberProfile | null = null
  try {
    profile = await apiGet<MemberProfile>('/api/me', token, 60)
  } catch {
    // fall through
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load profile. Please try refreshing.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-foreground">Profile</h1>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-5">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-2xl font-bold text-brand">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-surface-foreground">{profile.displayName}</h2>
            {profile.username && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Member since {joinedDate(profile.createdAt)}
            </p>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-surface-foreground whitespace-pre-wrap">{profile.bio}</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 text-base font-semibold text-surface-foreground">Edit profile</h2>
        <ProfileForm
          token={token}
          initialValues={{
            displayName: profile.displayName,
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
          }}
        />
      </div>
    </div>
  )
}
