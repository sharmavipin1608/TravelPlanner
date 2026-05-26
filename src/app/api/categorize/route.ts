import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AIService } from '@/lib/ai/ai-service'
import type { ApiResponse } from '@/types'
import type { CategorizedItem } from '@/lib/ai/types'

interface PostCategorizeBody {
  raw_text: string
  entry_id?: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<CategorizedItem>,
        { status: 401 }
      )
    }

    let body: PostCategorizeBody
    try {
      body = await request.json() as PostCategorizeBody
    } catch {
      return Response.json(
        { data: null, error: { code: 'invalid_json', message: 'Invalid JSON body' } } satisfies ApiResponse<CategorizedItem>,
        { status: 400 }
      )
    }

    if (!body.raw_text || typeof body.raw_text !== 'string' || body.raw_text.trim() === '') {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'raw_text is required' } } satisfies ApiResponse<CategorizedItem>,
        { status: 400 }
      )
    }

    const aiService = new AIService()
    const result = await aiService.categorize(body.raw_text)

    return Response.json({ data: result, error: null } satisfies ApiResponse<CategorizedItem>)
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<CategorizedItem>,
      { status: 500 }
    )
  }
}
