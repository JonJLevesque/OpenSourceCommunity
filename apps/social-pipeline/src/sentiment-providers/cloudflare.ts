/// <reference types="@cloudflare/workers-types" />
import type { SentimentProvider, SentimentResult } from './types'

// Map Workers AI output labels to our schema
const LABEL_MAP: Record<string, 'positive' | 'negative' | 'neutral'> = {
  'LABEL_0': 'negative',
  'LABEL_1': 'neutral',
  'LABEL_2': 'positive',
  'negative': 'negative',
  'neutral': 'neutral',
  'positive': 'positive',
}

export class CloudflareSentimentProvider implements SentimentProvider {
  constructor(private ai: Ai) {}

  async classify(text: string): Promise<SentimentResult> {
    const truncated = text.slice(0, 512)

    const output = await this.ai.run(
      '@cf/cardiffnlp/twitter-roberta-base-sentiment-latest' as keyof AiModels,
      { text: truncated }
    ) as Array<{ label: string; score: number }>

    const sorted = [...output].sort((a, b) => b.score - a.score)
    const top = sorted[0]!

    const distribution = {
      positive: output.find(o => LABEL_MAP[o.label] === 'positive')?.score ?? 0,
      negative: output.find(o => LABEL_MAP[o.label] === 'negative')?.score ?? 0,
      neutral:  output.find(o => LABEL_MAP[o.label] === 'neutral')?.score ?? 0,
    }

    return {
      label: LABEL_MAP[top.label] ?? 'neutral',
      score: top.score,
      distribution,
    }
  }
}

/** @deprecated Use CloudflareSentimentProvider instead */
export async function classifyWithCloudflare(ai: Ai, text: string): Promise<SentimentResult> {
  return new CloudflareSentimentProvider(ai).classify(text)
}
