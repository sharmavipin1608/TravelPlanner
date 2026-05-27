import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Trip, ApiResponse } from '@/types'

export async function PATCH(
  request: NextRequest,
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

    let body: { start_date?: string | null; end_date?: string | null }
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'Invalid JSON body' } } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    const updateData: { start_date?: string | null; end_date?: string | null } = {}
    if ('start_date' in body) updateData.start_date = body.start_date
    if ('end_date' in body) updateData.end_date = body.end_date

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'At least one field is required' } } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<null>,
        { status: 500 }
      )
    }

    if (!data) {
      return Response.json(
        { data: null, error: { code: 'not_found', message: 'Trip not found' } } satisfies ApiResponse<null>,
        { status: 404 }
      )
    }

    return Response.json({ data: data as Trip, error: null } satisfies ApiResponse<Trip>)
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
