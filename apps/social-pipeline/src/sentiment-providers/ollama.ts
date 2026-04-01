import type { SentimentProvider, SentimentResult } from './types'

function toLabel(response: string): 'positive' | 'negative' | 'neutral' {
  const lower = response.toLowerCase().trim()
  if (lower.includes('positive')) return 'positive'
  if (lower.includes('negative')) return 'negative'
  return 'neutral'
}

export class OllamaSentimentProvider implements SentimentProvider {
  constructor(private url: string = 'http://localhost:11434') {}

  async classify(text: string): Promise<SentimentResult> {
    try {
      const res = await fetch(`${this.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: `Classify the sentiment of the following text as exactly one word: "positive", "negative", or "neutral".\nText: "${text.slice(0, 500)}"\nRespond with only one word.`,
          stream: false,
        }),
      })

      if (!res.ok) {
        return { label: 'neutral', score: 0.5, distribution: { positive: 0.33, negative: 0.33, neutral: 0.34 } }
      }

      const json = await res.json() as { response: string }
      const label = toLabel(json.response)

      return {
        label,
        score: 1,
        distribution: {
          positive: label === 'positive' ? 1 : 0,
          negative: label === 'negative' ? 1 : 0,
          neutral:  label === 'neutral'  ? 1 : 0,
        },
      }
    } catch {
      return { label: 'neutral', score: 0.5, distribution: { positive: 0.33, negative: 0.33, neutral: 0.34 } }
    }
  }
}

/** @deprecated Use OllamaSentimentProvider instead */
export async function classifyWithOllama(text: string, baseUrl = 'http://localhost:11434'): Promise<SentimentResult> {
  return new OllamaSentimentProvider(baseUrl).classify(text)
}
