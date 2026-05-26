import type { Category } from '@/types'

export interface LLMProvider {
  complete(prompt: string): Promise<string>
}

export interface CategorizedItem {
  name: string
  category: Category | null
  destination: string | null
  notes: string | null
}
