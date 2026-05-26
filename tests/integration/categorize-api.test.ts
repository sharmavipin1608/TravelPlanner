import { describe, it, expect } from 'vitest'
import { AIService } from '@/lib/ai/ai-service'
import { MockProvider } from '@/lib/ai/providers/mock-provider'

describe('AIService — categorize with MockProvider', () => {
  const service = new AIService(new MockProvider())

  it('returns structured CategorizedItem from mock provider', async () => {
    const result = await service.categorize('some travel note')
    expect(result.name).toBe('Test Place')
    expect(result.category).toBe('place')
    expect(result.destination).toBe('Paris, France')
    expect(result.notes).toBeNull()
  })

  it('falls back gracefully on malformed JSON', async () => {
    class BrokenProvider {
      async complete(_prompt: string): Promise<string> {
        return 'not valid json {'
      }
    }
    const broken = new AIService(new BrokenProvider() as any)
    const result = await broken.categorize('my raw note')
    expect(result.name).toBe('my raw note')
    expect(result.category).toBeNull()
    expect(result.destination).toBeNull()
    expect(result.notes).toBeNull()
  })

  it('strips markdown code fences from LLM output', async () => {
    class FencedProvider {
      async complete(_prompt: string): Promise<string> {
        return '```json\n{"name":"Nobu","category":"restaurant","destination":"Tokyo, Japan","notes":"reservations needed"}\n```'
      }
    }
    const fenced = new AIService(new FencedProvider() as any)
    const result = await fenced.categorize('Nobu Tokyo')
    expect(result.name).toBe('Nobu')
    expect(result.category).toBe('restaurant')
    expect(result.destination).toBe('Tokyo, Japan')
    expect(result.notes).toBe('reservations needed')
  })

  it('coerces invalid category to null', async () => {
    class BadCategoryProvider {
      async complete(_prompt: string): Promise<string> {
        return JSON.stringify({ name: 'Test', category: 'museum', destination: null, notes: null })
      }
    }
    const bad = new AIService(new BadCategoryProvider() as any)
    const result = await bad.categorize('a museum')
    expect(result.category).toBeNull()
    expect(result.name).toBe('Test')
  })
})
