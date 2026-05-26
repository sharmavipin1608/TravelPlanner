import OpenAI from 'openai'
import type { LLMProvider } from '../types'

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  }

  async complete(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    return completion.choices[0]?.message?.content ?? ''
  }
}
