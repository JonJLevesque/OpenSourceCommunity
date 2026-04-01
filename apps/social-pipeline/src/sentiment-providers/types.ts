export type SentimentLabel = 'positive' | 'negative' | 'neutral'

export interface SentimentResult {
  label: SentimentLabel
  score: number                  // confidence 0-1
  distribution: { positive: number; negative: number; neutral: number }
}

export interface SentimentProvider {
  classify(text: string): Promise<SentimentResult>
}
