import type { LLMProvider } from './types'
import { MockProvider } from './providers/mock-provider'
import { ClaudeProvider } from './providers/claude-provider'
import { OpenAIProvider } from './providers/openai-provider'
import { GeminiProvider } from './providers/gemini-provider'

export function createProvider(providerName: string): LLMProvider {
  switch (providerName) {
    case 'claude':  return new ClaudeProvider()
    case 'openai':  return new OpenAIProvider()
    case 'gemini':  return new GeminiProvider()
    case 'mock':    return new MockProvider()
    default:
      console.warn(`Unknown LLM_PROVIDER "${providerName}", falling back to mock`)
      return new MockProvider()
  }
}
