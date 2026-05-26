import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMProvider } from '../types'

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  }

  async complete(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  }
}
