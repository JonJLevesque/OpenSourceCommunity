import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

// Cache TTL: 7 days (translations are deterministic for static content)
const CACHE_TTL = 60 * 60 * 24 * 7

function getCacheKey(text: string, targetLang: string): string {
  // Simple hash: FNV-1a 32-bit for speed
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  return `tr:${targetLang}:${hash.toString(36)}`
}

interface TranslateOptions {
  text: string
  targetLang: string
  geminiKey?: string | undefined
  anthropicKey?: string | undefined
  redisUrl?: string | undefined
  redisToken?: string | undefined
}

export async function translate(opts: TranslateOptions): Promise<{ translatedText: string; fromCache: boolean }> {
  const { text, targetLang, geminiKey, anthropicKey, redisUrl, redisToken } = opts

  // Don't translate if already in target language or if text is empty
  if (!text.trim()) return { translatedText: text, fromCache: false }

  // Check cache first
  let redis: Redis | null = null
  if (redisUrl && redisToken) {
    try {
      redis = new Redis({ url: redisUrl, token: redisToken })
      const cacheKey = getCacheKey(text, targetLang)
      const cached = await redis.get<string>(cacheKey)
      if (cached) return { translatedText: cached, fromCache: true }
    } catch {
      // Redis unavailable — skip cache
      redis = null
    }
  }

  const prompt = `Translate the following text to ${targetLang}. Return ONLY the translated text with no explanation, no quotes, no preamble:\n\n${text}`

  let translatedText: string | null = null

  // Primary: Gemini
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent(prompt)
      translatedText = result.response.text().trim()
    } catch {
      // Fall through to Claude
    }
  }

  // Fallback: Claude Haiku
  if (!translatedText && anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey })
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = message.content[0]
      if (block && block.type === 'text') {
        translatedText = block.text.trim()
      }
    } catch {
      // Both failed
    }
  }

  if (!translatedText) {
    return { translatedText: text, fromCache: false }
  }

  // Cache the result
  if (redis) {
    try {
      const cacheKey = getCacheKey(text, targetLang)
      await redis.set(cacheKey, translatedText, { ex: CACHE_TTL })
    } catch {
      // ignore cache write errors
    }
  }

  return { translatedText, fromCache: false }
}
