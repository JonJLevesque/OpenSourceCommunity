import { createSentimentProvider } from './sentiment-providers'
import type { SentimentProviderEnv } from './sentiment-providers'

export type { SentimentResult } from './sentiment-providers'

export async function classifySentiment(
  env: SentimentProviderEnv,
  texts: string[]
): Promise<import('./sentiment-providers').SentimentResult[]> {
  const provider = createSentimentProvider(env)
  const results: import('./sentiment-providers').SentimentResult[] = []

  for (const text of texts) {
    try {
      results.push(await provider.classify(text))
    } catch (err) {
      console.error('[sentiment] provider error:', err)
      results.push({
        label: 'neutral',
        score: 0.5,
        distribution: { positive: 0.33, negative: 0.33, neutral: 0.34 },
      })
    }
  }

  return results
}
