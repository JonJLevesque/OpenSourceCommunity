import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Courses Settings — Admin' }

interface CourseRow {
  course: {
    id: string
    title: string
    description: string | null
    status: 'draft' | 'published' | 'archived'
    coverImageUrl: string | null
    createdAt: string
  }
  lessonCount: number
  enrollmentCount: number
}

export default async function CoursesSettingsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  const result = (await apiGet<{ data: CourseRow[]; total: number }>('/api/courses?limit=50', token, 0)) ?? { data: [], total: 0 }
  const courseRows: CourseRow[] = Array.isArray(result) ? result : (result.data ?? [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-foreground">Courses Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage courses and structured learning content.
          </p>
        </div>
        <Link
          href="/courses/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
        >
          + New course
        </Link>
      </div>

      {courseRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">No courses yet.</p>
          <Link href="/courses/new" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
            Create your first course →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Course</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">Status</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">Lessons</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">Enrollments</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courseRows.map(({ course, lessonCount, enrollmentCount }) => (
                <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-surface-foreground">{course.title}</p>
                    {course.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{course.description}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Badge variant={course.status === 'published' ? 'success' : course.status === 'archived' ? 'outline' : 'secondary'}>
                      {course.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell">
                    {lessonCount}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-muted-foreground lg:table-cell">
                    {enrollmentCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/courses/${course.id}`}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
