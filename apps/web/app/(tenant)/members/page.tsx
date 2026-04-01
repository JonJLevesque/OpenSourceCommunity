import Link from 'next/link'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Members' }

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberRole = 'guest' | 'member' | 'moderator' | 'org_admin'

interface Member {
  id: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  role: MemberRole
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_BADGE_VARIANT: Record<MemberRole, React.ComponentProps<typeof Badge>['variant']> = {
  guest: 'secondary',
  member: 'blue',
  moderator: 'warning',
  org_admin: 'default',
}

const ROLE_LABEL: Record<MemberRole, string> = {
  guest: 'Guest',
  member: 'Member',
  moderator: 'Moderator',
  org_admin: 'Admin',
}

function joinedDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(iso))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; page?: string }>
}) {
  const { search, role, page = '1' } = await searchParams

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  const qs = new URLSearchParams({ page, limit: '40' })
  if (search) qs.set('search', search)
  if (role) qs.set('role', role)

  let members: Member[] = []
  let fetchError = false

  try {
    members = await apiGet<Member[]>(`/api/members?${qs}`, token, 60)
  } catch {
    fetchError = true
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Everyone in this community"
      />

      {/* Search & filter */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by name or username…"
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          name="role"
          defaultValue={role ?? ''}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All roles</option>
          <option value="member">Members</option>
          <option value="moderator">Moderators</option>
          <option value="org_admin">Admins</option>
        </select>

        <Button type="submit">Search</Button>

        {(search || role) && (
          <Link
            href="/members"
            className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load members. Please try refreshing.
        </div>
      )}

      {!fetchError && members.length === 0 && (search || role) && (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No members found"
          description="Try adjusting your search or filter."
        />
      )}

      {!fetchError && members.length === 0 && !search && !role && (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No members found"
        />
      )}

      {members.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-brand/20 transition-all"
            >
              <Avatar
                src={member.avatarUrl}
                name={member.displayName}
                size="lg"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-surface-foreground">
                  {member.displayName}
                </p>
                {member.username && (
                  <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant={ROLE_BADGE_VARIANT[member.role]}>
                    {ROLE_LABEL[member.role]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {joinedDate(member.createdAt)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {members.length === 40 && (
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link
              href={`/members?${new URLSearchParams({ ...(search ? { search } : {}), ...(role ? { role } : {}), page: String(Number(page) + 1) })}`}
            >
              Load more
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
