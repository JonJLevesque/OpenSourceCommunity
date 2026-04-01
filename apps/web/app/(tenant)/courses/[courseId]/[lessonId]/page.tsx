import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Metadata } from 'next'
import { CompleteButton } from './complete-button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseLesson {
  id: string
  courseId: string
  title: string
  body: Record<string, unknown>
  videoUrl: string | null
  sortOrder: number
  isPublished: boolean
  createdAt: string
}

interface Course {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'archived'
}

interface CourseEnrollment {
  id: string
  courseId: string
  memberId: string
  status: 'enrolled' | 'completed' | 'dropped'
  completedLessonIds: string[]
  completedAt: string | null
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
  params: Promise<{ courseId: string; lessonId: string }>
}): Promise<Metadata> {
  const { courseId } = await params
  try {
    const { course } = await apiGet<CourseDetailResponse>(`/api/courses/${courseId}`)
    return { title: course.title }
  } catch {
    return { title: 'Lesson' }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params

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
  const lesson = lessons.find((l) => l.id === lessonId)

  if (!lesson) notFound()

  const completedIds = enrollment?.completedLessonIds ?? []
  const isComplete = completedIds.includes(lessonId)
  const isEnrolled = enrollment !== null

  // Adjacent lessons for prev/next navigation
  const sortedLessons = [...lessons].sort((a, b) => a.sortOrder - b.sortOrder)
  const currentIndex = sortedLessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null

  // Extract plain-text content from the body jsonb (handles simple {text: "..."} or prosemirror-style)
  const bodyText = extractBodyText(lesson.body)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/courses" className="hover:text-brand transition-colors">
          Courses
        </Link>
        <span>/</span>
        <Link href={`/courses/${courseId}`} className="hover:text-brand transition-colors">
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-surface-foreground">{lesson.title}</span>
      </nav>

      {/* ── Lesson header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-bold text-surface-foreground">{lesson.title}</h1>

        {isEnrolled && (
          <CompleteButton
            courseId={courseId}
            lessonId={lessonId}
            token={token}
            isComplete={isComplete}
          />
        )}
      </div>

      {/* ── Video embed ───────────────────────────────────────────────────── */}
      {lesson.videoUrl && (
        <div className="overflow-hidden rounded-xl bg-black">
          {isYouTubeUrl(lesson.videoUrl) ? (
            <iframe
              src={toYouTubeEmbed(lesson.videoUrl)}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          ) : (
            <video
              src={lesson.videoUrl}
              controls
              className="aspect-video w-full"
              title={lesson.title}
            />
          )}
        </div>
      )}

      {/* ── Lesson content ────────────────────────────────────────────────── */}
      {bodyText && (
        <div className="rounded-xl border border-border bg-card px-6 py-5">
          <div className="prose prose-sm max-w-none text-surface-foreground">
            {bodyText.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Prev / Next navigation ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        {prevLesson ? (
          <Link
            href={`/courses/${courseId}/${prevLesson.id}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand transition-colors"
          >
            <ChevronLeftIcon />
            {prevLesson.title}
          </Link>
        ) : (
          <div />
        )}

        {nextLesson ? (
          <Link
            href={`/courses/${courseId}/${nextLesson.id}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand transition-colors"
          >
            {nextLesson.title}
            <ChevronRightIcon />
          </Link>
        ) : (
          <Link
            href={`/courses/${courseId}`}
            className="flex items-center gap-1.5 text-sm text-brand hover:text-surface-foreground font-medium transition-colors"
          >
            Back to course
            <ChevronRightIcon />
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractBodyText(body: Record<string, unknown>): string {
  if (typeof body.text === 'string') return body.text
  if (typeof body.content === 'string') return body.content

  // ProseMirror / TipTap document — walk the node tree
  function walkNodes(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as Record<string, unknown>
    if (typeof n.text === 'string') return n.text
    if (Array.isArray(n.content)) {
      return (n.content as unknown[]).map(walkNodes).join('\n')
    }
    return ''
  }

  return walkNodes(body)
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url)
}

function toYouTubeEmbed(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (!match) return url
  return `https://www.youtube.com/embed/${match[1]}`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <polyline strokeLinecap="round" strokeLinejoin="round" points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <polyline strokeLinecap="round" strokeLinejoin="round" points="9 18 15 12 9 6" />
    </svg>
  )
}
