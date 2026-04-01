import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet, ApiError } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Courses' }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseListItem {
  course: {
    id: string
    title: string
    description: string | null
    coverImageUrl: string | null
    status: 'draft' | 'published' | 'archived'
    createdAt: string
  }
  lessonCount: number
  enrollmentCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COVER_GRADIENTS = [
  'from-brand/60 to-violet-500/80',
  'from-rose-400 to-orange-400',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-yellow-500',
  'from-fuchsia-400 to-pink-500',
]

function gradientForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length] ?? COVER_GRADIENTS[0] ?? ''
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CoursesPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  const role = (session?.user?.app_metadata?.role as string | undefined) ?? 'member'
  const canManage = role === 'org_admin'

  let items: CourseListItem[] = []
  let fetchError = false
  let moduleDisabled = false

  try {
    items = await apiGet<CourseListItem[]>('/api/courses', token)
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      moduleDisabled = true
    } else {
      fetchError = true
    }
  }

  if (moduleDisabled) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title="Courses not enabled"
        description="The Courses module is not enabled for this community."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Self-paced learning for your community"
        action={
          canManage ? (
            <Button asChild>
              <Link href="/courses/new">Create course</Link>
            </Button>
          ) : undefined
        }
      />

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load courses. Please try refreshing the page.
        </div>
      )}

      {!fetchError && items.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="No courses yet"
          description={
            canManage
              ? 'Create the first course to start teaching your community.'
              : 'Courses will appear here once they are published.'
          }
          action={
            canManage ? (
              <Button asChild>
                <Link href="/courses/new">Create course</Link>
              </Button>
            ) : undefined
          }
        />
      )}

      {!fetchError && items.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CourseCard key={item.course.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ item }: { item: CourseListItem }) {
  const { course, lessonCount, enrollmentCount } = item
  const gradient = gradientForId(course.id)

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      {course.coverImageUrl ? (
        <img
          src={course.coverImageUrl}
          alt={course.title}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className={`flex h-40 w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
          <BookOpen className="h-10 w-10 text-white/70" />
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {course.status === 'draft' && (
          <Badge variant="warning" className="mb-2 w-fit">Draft</Badge>
        )}
        {course.status === 'archived' && (
          <Badge variant="secondary" className="mb-2 w-fit">Archived</Badge>
        )}

        <h2 className="text-sm font-semibold text-surface-foreground line-clamp-2 group-hover:text-brand transition-colors">
          {course.title}
        </h2>

        {course.description && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
          </span>

          {enrollmentCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {enrollmentCount.toLocaleString()} enrolled
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
