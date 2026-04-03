'use client'

import { useState } from 'react'
import { Languages, RotateCcw, Loader2 } from 'lucide-react'
import { apiClientPost } from '@/lib/api-client'

interface TranslateButtonProps {
  /** Items to translate — provide ids + text; get back a map of id → translated text */
  items: Array<{ id: string; text: string }>
  targetLang: string
  onTranslated: (translations: Record<string, string>) => void
  onReset: () => void
  isTranslated: boolean
}

export function TranslateButton({
  items,
  targetLang,
  onTranslated,
  onReset,
  isTranslated,
}: TranslateButtonProps) {
  const [loading, setLoading] = useState(false)

  const langLabel = new Intl.DisplayNames(['en'], { type: 'language' }).of(targetLang) ?? targetLang

  async function handleTranslate() {
    if (items.length === 0) return
    setLoading(true)
    try {
      const results = await Promise.all(
        items.map(async ({ id, text }) => {
          const res = await apiClientPost<{ translatedText: string; fromCache: boolean }>(
            '/api/translate',
            { text, targetLang },
          )
          return { id, translatedText: res.translatedText }
        }),
      )
      const map: Record<string, string> = {}
      for (const { id, translatedText } of results) {
        map[id] = translatedText
      }
      onTranslated(map)
    } finally {
      setLoading(false)
    }
  }

  if (isTranslated) {
    return (
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        View original
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleTranslate}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Languages className="h-3.5 w-3.5" />
      )}
      {loading ? 'Translating…' : `Translate to ${langLabel}`}
    </button>
  )
}
