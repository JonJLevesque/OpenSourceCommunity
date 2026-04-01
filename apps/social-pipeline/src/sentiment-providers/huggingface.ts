import type { SentimentProvider, SentimentResult } from './types'

const MODEL = 'cardiffnlp/twitter-roberta-base-sentiment-latest'

interface HFResult {
  label: string
  score: number
}

export class HuggingFaceSentimentProvider implements SentimentProvider {
  constructor(private apiToken?: string) {}

  async classify(text: string): Promise<SentimentResult> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (this.apiToken) headers['Authorization'] = `Bearer ${this.apiToken}`

      const res = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ inputs: text.slice(0, 512) }),
      })

      if (!res.ok) {
        return { label: 'neutral', score: 0.5, distribution: { positive: 0.33, negative: 0.33, neutral: 0.34 } }
      }

      const results = await res.json() as HFResult[][]
      const sorted = results[0]?.sort((a, b) => b.score - a.score)
      const top = sorted?.[0]

      if (!top) {
        return { label: 'neutral', score: 0.5, distribution: { positive: 0.33, negative: 0.33, neutral: 0.34 } }
      }

      // HF labels: LABEL_0 = negative, LABEL_1 = neutral, LABEL_2 = positive
      // OR direct labels: 'negative', 'neutral', 'positive'
      const rawLabel = top.label.toLowerCase()
      let label: 'positive' | 'negative' | 'neutral'
      if (rawLabel === 'positive' || rawLabel === 'label_2') label = 'positive'
      else if (rawLabel === 'negative' || rawLabel === 'label_0') label = 'negative'
      else label = 'neutral'

      const distribution = {
        positive: sorted?.find(r => r.label.toLowerCase() === 'positive' || r.label.toLowerCase() === 'label_2')?.score ?? 0,
        negative: sorted?.find(r => r.label.toLowerCase() === 'negative' || r.label.toLowerCase() === 'label_0')?.score ?? 0,
        neutral:  sorted?.find(r => r.label.toLowerCase() === 'neutral'  || r.label.toLowerCase() === 'label_1')?.score ?? 0,
      }

      return { label, score: top.score, distribution }
    } catch {
      return { label: 'neutral', score: 0.5, distribution: { positive: 0.33, negative: 0.33, neutral: 0.34 } }
    }
  }
}

/** @deprecated Use HuggingFaceSentimentProvider instead */
export async function classifyWithHuggingFace(text: string, apiToken?: string): Promise<SentimentResult> {
  return new HuggingFaceSentimentProvider(apiToken).classify(text)
}
