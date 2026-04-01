import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Metadata } from 'next'
import { EnrollButton } from './enroll-button'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Course {
  id: string
  title: string
  description: string | null
  coverImageUrl: string | null
  status: 'draft' | 'published' | 'archived'
  createdAt: string
}

export interface CourseLesson {
  id: string
  courseId: string
  title: string
  body: Record<string, unknown>
  videoUrl: string | null
  sortOrder: number
  isPublished: boolean
  createdAt: string
}

export interface CourseEnrollment {
  id: string
  courseId: string
  memberId: string
  status: 'enrolled' | 'completed' | 'dropped'
  completedLessonIds: string[]
  completedAt: string | null
  createdAt: string
}

interface CourseDetailResponse {
  course: Course
  lessons: CourseLesson[]
  enrollment: CourseEnrollment | null
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>
}): Promise<Metadata> {
  const { courseId } = await params
  try {
    const { course } = await apiGet<CourseDetailResponse>(`/api/courses/${courseId}`)
    return { title: course.title }
  } catch {
    return { title: 'Course' }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  let detail: CourseDetailResponse

  try {
    detail = await apiGet<CourseDetailResponse>(`/api/courses/${courseId}`, token, 0)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  const { course, lessons, enrollment } = detail
  const isEnrolled = enrollment !== null
  const completedIds = enrollment?.completedLessonIds ?? []
  const completedCount = completedIds.length
  const totalLessons = lessons.length
  const isCourseComplete = enrollment?.completedAt !== null && enrollment?.completedAt !== undefined

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ── Course header ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {course.coverImageUrl ? (
          <img
            src={course.coverImageUrl}
            alt={course.title}
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-indigo-400 to-violet-500">
            <BookOpenIcon className="h-16 w-16 text-white/70" />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-surface-foreground">{course.title}</h1>
              {course.description && (
                <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
              )}
            </div>

            <div className="flex-shrink-0">
              {isEnrolled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  <CheckIcon className="h-4 w-4" />
                  {isCourseComplete ? 'Completed' : 'Enrolled'}
                </span>
              ) : (
                <EnrollButton courseId={courseId} token={token} />
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isEnrolled && totalLessons > 0 && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{completedCount}/{totalLessons} lessons</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpenIcon className="h-3.5 w-3.5" />
              {totalLessons} {totalLessons === 1 ? 'lesson' : 'lessons'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Lesson list ───────────────────────────────────────────────────── */}
      {lessons.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-surface-foreground">Lessons</h2>
          </div>

          <ol className="divide-y divide-border">
            {lessons.map((lesson, index) => {
              const isComplete = completedIds.includes(lesson.id)
              const canAccess = isEnrolled

              return (
                <li key={lesson.id}>
                  {canAccess ? (
                    <Link
                      href={`/courses/${courseId}/${lesson.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-muted transition-colors"
                    >
                      <LessonNumber index={index} isComplete={isComplete} />
                      <span className="flex-1 text-sm font-medium text-surface-foreground">
                        {lesson.title}
                      </span>
                      {lesson.videoUrl && (
                        <span className="flex-shrink-0 text-xs text-muted-foreground">Video</span>
                      )}
                      {isComplete && (
                        <CheckIcon className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                      )}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4 px-6 py-4 opacity-60">
                      <LessonNumber index={index} isComplete={false} />
                      <span className="flex-1 text-sm font-medium text-muted-foreground">
                        {lesson.title}
                      </span>
                      <LockIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* ── Enroll CTA at bottom ──────────────────────────────────────────── */}
      {!isEnrolled && lessons.length > 0 && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 px-6 py-5 text-center">
          <p className="mb-3 text-sm text-surface-foreground">Enroll to start learning</p>
          <EnrollButton courseId={courseId} token={token} />
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LessonNumber({ index, isComplete }: { index: number; isComplete: boolean }) {
  return (
    <span
      className={[
        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        isComplete
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-muted text-muted-foreground',
      ].join(' ')}
    >
      {isComplete ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
    </span>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BookOpenIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <polyline strokeLinecap="round" strokeLinejoin="round" points="20 6 9 17 4 12" />
    </svg>
  )
}

function LockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <rect strokeLinecap="round" strokeLinejoin="round" x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
