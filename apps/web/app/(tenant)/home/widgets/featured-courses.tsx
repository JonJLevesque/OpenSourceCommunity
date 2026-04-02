import Link from 'next/link'
import { GraduationCap, BookOpen, Users } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { WidgetShell } from './widget-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseRow {
  course: {
    id: string
    title: string
    description?: string
    coverImageUrl?: string
    status: 'draft' | 'published' | 'archived'
    createdAt: string
  }
  lessonCount: number
  enrollmentCount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRADIENTS = [
  'from-brand/60 to-violet-500/80',
  'from-rose-400 to-orange-400',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-yellow-500',
  'from-fuchsia-400 to-pink-500',
]

function gradientForId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function FeaturedCourses({ token }: { token: string | undefined }) {
  let rows: CourseRow[] = []

  try {
    rows = await apiGet<CourseRow[]>('/api/courses', token, 300)
  } catch {
    return null
  }

  const courses = rows.filter(r => r.course.status === 'published').slice(0, 3)
  if (courses.length === 0) return null

  return (
    <WidgetShell
      title="Courses"
      icon={<GraduationCap className="h-4 w-4" />}
      href="/courses"
      hrefLabel="All courses"
      size="lg"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map(({ course, lessonCount, enrollmentCount }) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-border hover:border-brand/30 hover:shadow-md transition-all"
          >
            {/* Cover */}
            <div className="relative h-24 overflow-hidden">
              {course.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.coverImageUrl}
                  alt={course.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientForId(course.id)}`}>
                  <BookOpen className="h-8 w-8 text-white/60" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <p className="text-sm font-semibold text-surface-foreground line-clamp-2 group-hover:text-brand transition-colors leading-snug">
                {course.title}
              </p>
              <div className="mt-auto flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] gap-1 py-0 px-1.5">
                  <Users className="h-2.5 w-2.5" />
                  {enrollmentCount}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </WidgetShell>
  )
}
