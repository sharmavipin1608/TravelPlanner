import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Item, ApiResponse } from '@/types'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<null>,
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()

    if (error) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<null>,
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return Response.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Item not found' } } satisfies ApiResponse<null>,
        { status: 404 }
      )
    }

    return Response.json({ data: null, error: null } satisfies ApiResponse<null>)
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
