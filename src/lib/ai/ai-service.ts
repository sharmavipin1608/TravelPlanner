import type { LLMProvider, CategorizedItem } from './types'
import { createProvider } from './factory'

export class AIService {
  private provider: LLMProvider

  constructor(provider?: LLMProvider) {
    this.provider = provider ?? createProvider(process.env.LLM_PROVIDER ?? 'mock')
  }

  async categorize(rawText: string): Promise<CategorizedItem> {
    const prompt = `You are a travel assistant. Extract structured info from this travel note.

Note: "${rawText}"

Return ONLY valid JSON (no markdown, no code fences, no explanation):
{"name":"place name","category":"restaurant|place|accommodation|activity or null","destination":"City, Country or null","notes":"extra context or null"}

Rules:
- name: the place name only
- category: one of restaurant, place, accommodation, activity — or null if unclear
- destination: city + country where the place is located (e.g. "Tokyo, Japan") — or null if unknown. NEVER include the word "null" in the string.
- notes: brief context, or null`

    try {
      const raw = await this.provider.complete(prompt)
      const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      const parsed = JSON.parse(cleaned) as CategorizedItem

      const cleanDestination = (d: unknown): string | null => {
        if (typeof d !== 'string') return null
        const trimmed = d.trim()
        // Reject strings that contain the word "null" literally
        if (/\bnull\b/i.test(trimmed)) return null
        return trimmed || null
      }

      return {
        name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : rawText,
        category: ['place','restaurant','accommodation','activity'].includes(parsed.category as string)
          ? parsed.category
          : null,
        destination: cleanDestination(parsed.destination),
        notes: typeof parsed.notes === 'string' && parsed.notes.trim() ? parsed.notes.trim() : null,
      }
    } catch {
      return { name: rawText, category: null, destination: null, notes: null }
    }
  }
}
