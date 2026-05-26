import { describe, it, expect } from 'vitest'
import { AIService } from '@/lib/ai/ai-service'
import { MockProvider } from '@/lib/ai/providers/mock-provider'

describe('AIService.categorize', () => {
  it('returns a valid CategorizedItem from MockProvider', async () => {
    const service = new AIService(new MockProvider())
    const result = await service.categorize('Nobu Tokyo for omakase')
    expect(result.name).toBeTruthy()
    expect(['place','restaurant','accommodation','activity',null]).toContain(result.category)
  })

  it('falls back gracefully on malformed JSON', async () => {
    const badProvider = { complete: async () => 'not json at all' }
    const service = new AIService(badProvider)
    const result = await service.categorize('Some random note')
    expect(result.name).toBe('Some random note')
    expect(result.category).toBeNull()
    expect(result.destination).toBeNull()
  })

  it('strips markdown code fences from response', async () => {
    const fencedProvider = {
      complete: async () => '```json\n{"name":"Café","category":"restaurant","destination":"Paris, France","notes":null}\n```'
    }
    const service = new AIService(fencedProvider)
    const result = await service.categorize('Café in Paris')
    expect(result.name).toBe('Café')
    expect(result.category).toBe('restaurant')
  })

  it('rejects invalid category values', async () => {
    const badCatProvider = {
      complete: async () => '{"name":"Place","category":"hotel","destination":null,"notes":null}'
    }
    const service = new AIService(badCatProvider)
    const result = await service.categorize('some hotel')
    expect(result.category).toBeNull()
  })
})
