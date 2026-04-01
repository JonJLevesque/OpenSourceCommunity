/**
 * Webhook dispatch is NOT done via a global onAny listener because Cloudflare
 * Workers requests are concurrent within an isolate — a global listener would
 * capture the wrong request context across concurrent requests.
 *
 * Instead, use `emitEvent()` in route handlers to emit + dispatch atomically.
 */

export { emitEvent } from './emit-event'
