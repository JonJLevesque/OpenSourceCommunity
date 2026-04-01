/**
 * Typed fetch wrapper for the OpenSourceCommunity Hono API (Cloudflare Worker).
 *
 * All API responses follow the envelope:  { data: T, error?: string }
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

// ─── Types ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ApiEnvelope<T> {
  data: T
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore JSON parse failure — use status message
    }
    throw new ApiError(res.status, message)
  }

  const envelope = (await res.json()) as ApiEnvelope<T>
  return envelope.data
}

function authHeaders(token?: string): HeadersInit {
  const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET a resource from the API.
 *
 * @param path    - e.g. `/forums/categories`
 * @param token   - JWT access token (omit for public endpoints)
 * @param revalidate - ISR revalidation window in seconds (default 30)
 */
export async function apiGet<T>(
  path: string,
  token?: string,
  revalidate = 30,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(token),
    next: { revalidate },
  })
  return parseResponse<T>(res)
}

/**
 * POST a resource to the API.
 *
 * @param path  - e.g. `/forums/threads`
 * @param body  - Request payload (will be JSON-serialised)
 * @param token - JWT access token (required for all mutations)
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  token: string,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  return parseResponse<T>(res)
}

/**
 * PATCH a resource on the API.
 */
export async function apiPatch<T>(
  path: string,
  body: unknown,
  token: string,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  return parseResponse<T>(res)
}

/**
 * DELETE a resource on the API.
 */
export async function apiDelete<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  return parseResponse<T>(res)
}
