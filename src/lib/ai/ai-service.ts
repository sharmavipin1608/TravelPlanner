import type { LLMProvider, CategorizedItem } from './types'
import { createProvider } from './factory'

export class AIService {
  private provider: LLMProvider

  constructor(provider?: LLMProvider) {
    this.provider = provider ?? createProvider(process.env.LLM_PROVIDER ?? 'mock')
  }

  async categorize(rawText: string): Promise<CategorizedItem> {
    const prompt = `You are a travel assistant. Given this travel note, extract structured information.

Note: "${rawText}"

Return ONLY a JSON object with these exact fields (no markdown, no explanation):
{
  "name": "place name",
  "category": "place" | "restaurant" | "accommodation" | "activity" | null,
  "destination": "City, Country" | null,
  "notes": "any additional context" | null
}

If you cannot determine a field with confidence, use null.`

    try {
      const raw = await this.provider.complete(prompt)
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      const parsed = JSON.parse(cleaned) as CategorizedItem
      return {
        name: typeof parsed.name === 'string' ? parsed.name : rawText,
        category: ['place','restaurant','accommodation','activity'].includes(parsed.category as string)
          ? parsed.category
          : null,
        destination: typeof parsed.destination === 'string' ? parsed.destination : null,
        notes: typeof parsed.notes === 'string' ? parsed.notes : null,
      }
    } catch {
      return { name: rawText, category: null, destination: null, notes: null }
    }
  }
}
