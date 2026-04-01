'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { apiClientPatch } from '@/lib/api-client'

interface ProfileFormProps {
  token: string
  initialValues: {
    displayName: string
    username: string | null
    bio: string | null
    avatarUrl: string | null
    socialHandles?: Record<string, string>
  }
}

export function ProfileForm({ token: _token, initialValues }: ProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [displayName, setDisplayName] = useState(initialValues.displayName)
  const [username, setUsername] = useState(initialValues.username ?? '')
  const [bio, setBio] = useState(initialValues.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatarUrl ?? '')
  const [twitterHandle, setTwitterHandle] = useState(initialValues.socialHandles?.twitter ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(initialValues.socialHandles?.linkedin ?? '')
  const [redditUsername, setRedditUsername] = useState(initialValues.socialHandles?.reddit ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-surface-foreground mb-1'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {}
        if (displayName.trim()) payload.displayName = displayName.trim()
        // Only include username when it has a value and has changed
        if (username.trim() && username.trim() !== (initialValues.username ?? '')) {
          payload.username = username.trim()
        }
        if (bio !== initialValues.bio) payload.bio = bio.trim()
        if (avatarUrl !== initialValues.avatarUrl) payload.avatarUrl = avatarUrl.trim()
        payload.socialHandles = {
          ...(twitterHandle ? { twitter: twitterHandle } : {}),
          ...(linkedinUrl ? { linkedin: linkedinUrl } : {}),
          ...(redditUsername ? { reddit: redditUsername } : {}),
        }

        await apiClientPatch('/api/me', payload)
        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Display name</label>
          <input
            type="text"
            required
            maxLength={200}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className={labelClass}>Username</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">@</span>
            <input
              type="text"
              maxLength={50}
              pattern="[a-z0-9_-]*"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className={`${inputClass} pl-7`}
              placeholder="username"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Lowercase letters, numbers, _ and - only</p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Bio</label>
        <textarea
          rows={3}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className={`${inputClass} resize-y`}
          placeholder="Tell the community about yourself…"
        />
        <p className="mt-1 text-xs text-muted-foreground">{bio.length}/500</p>
      </div>

      <div>
        <label className={labelClass}>Avatar URL</label>
        <input
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className={inputClass}
          placeholder="https://…"
        />
      </div>

      {/* Social Profiles */}
      <div className="border-t border-border pt-6">
        <h3 className="mb-4 text-sm font-semibold text-surface-foreground">Social Profiles</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Twitter / X</label>
            <input
              type="text"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="@yourhandle"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">LinkedIn</label>
            <input
              type="text"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="linkedin.com/in/yourname"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Reddit</label>
            <input
              type="text"
              value={redditUsername}
              onChange={(e) => setRedditUsername(e.target.value)}
              placeholder="u/yourname"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Profile updated!
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !displayName.trim()}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
