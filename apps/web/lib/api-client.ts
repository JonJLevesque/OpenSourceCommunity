/**
 * Client-side fetch wrapper for the Hono API.
 *
 * Mirrors lib/api.ts but runs in the browser — reads NEXT_PUBLIC_* env vars
 * and auto-injects X-Tenant-Slug + Authorization headers on every request.
 *
 * Use this in all 'use client' components instead of raw fetch().
 */

import { createClient } from '@/lib/supabase/client'
import { ApiError } from './api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG

interface ApiEnvelope<T> {
  data: T
  error?: string
}

async function getHeaders(includeContentType = true): Promise<HeadersInit> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(TENANT_SLUG ? { 'X-Tenant-Slug': TENANT_SLUG } : {}),
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const body = (await res.json()) as { error?: unknown }
      if (typeof body.error === 'string') message = body.error
    } catch {
      // ignore parse failure
    }
    throw new ApiError(res.status, message)
  }
  const envelope = (await res.json()) as ApiEnvelope<T>
  return envelope.data
}

export async function apiClientGet<T>(path: string): Promise<T> {
  const headers = await getHeaders(false)
  const res = await fetch(`${API_URL}${path}`, { headers })
  return parseResponse<T>(res)
}

export async function apiClientPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return parseResponse<T>(res)
}

export async function apiClientPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  return parseResponse<T>(res)
}

export async function apiClientPut<T>(path: string, body: unknown): Promise<T> {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  return parseResponse<T>(res)
}

export async function apiClientDelete<T>(path: string): Promise<T> {
  const headers = await getHeaders(false)
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers,
  })
  return parseResponse<T>(res)
}
