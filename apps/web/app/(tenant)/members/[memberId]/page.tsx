import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

interface MemberDetail {
  id: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  role: string
  createdAt: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ memberId: string }>
}): Promise<Metadata> {
  const { memberId } = await params
  try {
    const supabase = await createClient()
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const member = await apiGet<MemberDetail>(`/api/members/${memberId}`, token)
    return { title: member.displayName }
  } catch {
    return { title: 'Member' }
  }
}

function joinedDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(iso))
}

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
  guest: 'Guest',
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let member: MemberDetail | null = null
  try {
    member = await apiGet<MemberDetail>(`/api/members/${memberId}`, token)
  } catch {
    notFound()
  }
  if (!member) notFound()

  const roleLabel = ROLE_LABELS[member.role] ?? member.role

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/members" className="hover:text-muted-foreground">Members</Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium truncate max-w-[200px]">
          {member.displayName}
        </span>
      </nav>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-5">
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.displayName}
              className="h-20 w-20 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-2xl font-bold text-brand">
              {member.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-surface-foreground">{member.displayName}</h1>
              {member.role !== 'member' && member.role !== 'guest' && (
                <span className="inline-flex items-center rounded-full bg-brand/5 px-2.5 py-0.5 text-xs font-medium text-brand">
                  {roleLabel}
                </span>
              )}
            </div>

            {member.username && (
              <p className="text-sm text-muted-foreground">@{member.username}</p>
            )}

            <p className="mt-1 text-xs text-muted-foreground">
              Member since {joinedDate(member.createdAt)}
            </p>
          </div>
        </div>

        {member.bio && (
          <p className="mt-5 text-sm text-surface-foreground whitespace-pre-wrap border-t border-border pt-5">
            {member.bio}
          </p>
        )}
      </div>
    </div>
  )
}
