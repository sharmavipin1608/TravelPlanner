import type { LLMProvider } from '../types'

export class MockProvider implements LLMProvider {
  async complete(_prompt: string): Promise<string> {
    return JSON.stringify({
      name: 'Test Place',
      category: 'place',
      destination: 'Paris, France',
      notes: null,
    })
  }
}
