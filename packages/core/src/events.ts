type EventHandler<T = unknown> = (payload: T) => Promise<void>
type AnyEventHandler = (eventType: string, payload: unknown) => Promise<void>

class EventBus {
  private handlers = new Map<string, EventHandler[]>()
  private anyHandlers: AnyEventHandler[] = []

  on<T>(eventType: string, handler: EventHandler<T>) {
    const existing = this.handlers.get(eventType) ?? []
    this.handlers.set(eventType, [...existing, handler as EventHandler])
  }

  /** Listen to ALL events — used for webhook dispatch, email notifications, etc. */
  onAny(handler: AnyEventHandler) {
    this.anyHandlers = [...this.anyHandlers, handler]
  }

  offAny(handler: AnyEventHandler) {
    this.anyHandlers = this.anyHandlers.filter(h => h !== handler)
  }

  async emit<T>(eventType: string, payload: T) {
    const handlers = this.handlers.get(eventType) ?? []
    await Promise.allSettled([
      ...handlers.map(h => h(payload)),
      ...this.anyHandlers.map(h => h(eventType, payload)),
    ])
  }

  off(eventType: string, handler: EventHandler) {
    const existing = this.handlers.get(eventType) ?? []
    this.handlers.set(eventType, existing.filter(h => h !== handler))
  }
}

export const eventBus = new EventBus()

// Typed event definitions
export const Events = {
  // Forums
  FORUM_THREAD_CREATED: 'forums:thread.created',
  FORUM_POST_CREATED: 'forums:post.created',
  FORUM_THREAD_RESOLVED: 'forums:thread.resolved',
  // Ideas
  IDEA_CREATED: 'ideas:idea.created',
  IDEA_VOTED: 'ideas:idea.voted',
  IDEA_STATUS_CHANGED: 'ideas:idea.status_changed',
  // Events
  EVENT_PUBLISHED: 'events:event.published',
  EVENT_RSVP: 'events:event.rsvp',
  // Courses
  COURSE_COMPLETED: 'courses:course.completed',
  LESSON_COMPLETED: 'courses:lesson.completed',
  // KB
  KB_ARTICLE_PUBLISHED: 'kb:article.published',
  // Social Intel
  SI_ALERT_TRIGGERED: 'social-intel:alert.triggered',
  SI_MENTION_RECEIVED: 'social-intel:mention.received',
  // Members
  MEMBER_JOINED: 'core:member.joined',
  MEMBER_ROLE_CHANGED: 'core:member.role_changed',
} as const

export type EventType = typeof Events[keyof typeof Events]
