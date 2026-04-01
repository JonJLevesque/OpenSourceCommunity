/// <reference types="@cloudflare/workers-types" />
import type { SentimentProvider } from './types'
import { CloudflareSentimentProvider } from './cloudflare'
import { OllamaSentimentProvider } from './ollama'
import { HuggingFaceSentimentProvider } from './huggingface'

export type { SentimentProvider, SentimentResult, SentimentLabel } from './types'
export { CloudflareSentimentProvider } from './cloudflare'
export { OllamaSentimentProvider } from './ollama'
export { HuggingFaceSentimentProvider } from './huggingface'

export interface SentimentProviderEnv {
  AI?: Ai
  SENTIMENT_PROVIDER?: string
  OLLAMA_URL?: string
  HUGGINGFACE_API_TOKEN?: string
}

export function createSentimentProvider(env: SentimentProviderEnv): SentimentProvider {
  const provider = env.SENTIMENT_PROVIDER ?? (env.AI ? 'cloudflare' : 'ollama')

  switch (provider) {
    case 'cloudflare':
      if (env.AI) return new CloudflareSentimentProvider(env.AI)
      console.warn('[sentiment] cloudflare provider selected but env.AI not available, falling back to ollama')
      return new OllamaSentimentProvider(env.OLLAMA_URL)
    case 'huggingface':
      return new HuggingFaceSentimentProvider(env.HUGGINGFACE_API_TOKEN)
    case 'ollama':
    default:
      return new OllamaSentimentProvider(env.OLLAMA_URL)
  }
}

/** @deprecated Use createSentimentProvider(env).classify(text) instead */
export async function classifySentimentSingle(
  text: string,
  env: SentimentProviderEnv
): Promise<import('./types').SentimentResult> {
  return createSentimentProvider(env).classify(text)
}
