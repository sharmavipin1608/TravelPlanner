import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface PostTripItemBody {
  trip_id: string
  item_id: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<void>,
        { status: 401 }
      )
    }

    let body: PostTripItemBody
    try {
      body = await request.json() as PostTripItemBody
    } catch {
      return Response.json(
        { data: null, error: { code: 'invalid_json', message: 'Invalid JSON body' } } satisfies ApiResponse<void>,
        { status: 400 }
      )
    }

    if (!body.trip_id || typeof body.trip_id !== 'string') {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'trip_id is required' } } satisfies ApiResponse<void>,
        { status: 400 }
      )
    }
    if (!body.item_id || typeof body.item_id !== 'string') {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'item_id is required' } } satisfies ApiResponse<void>,
        { status: 400 }
      )
    }

    // Verify the trip belongs to the authenticated user
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', body.trip_id)
      .eq('user_id', user.id)
      .single()

    if (tripError || !trip) {
      return Response.json(
        { data: null, error: { code: 'not_found', message: 'Trip not found' } } satisfies ApiResponse<void>,
        { status: 404 }
      )
    }

    // Verify the item belongs to the authenticated user
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id')
      .eq('id', body.item_id)
      .eq('user_id', user.id)
      .single()

    if (itemError || !item) {
      return Response.json(
        { data: null, error: { code: 'not_found', message: 'Item not found' } } satisfies ApiResponse<void>,
        { status: 404 }
      )
    }

    const { error: insertError } = await supabase
      .from('trip_items')
      .insert({ trip_id: body.trip_id, item_id: body.item_id })

    if (insertError) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<void>,
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from('items')
      .update({ status: 'planned' })
      .eq('id', body.item_id)
      .eq('user_id', user.id)

    if (updateError) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<void>,
        { status: 500 }
      )
    }

    return Response.json({ data: null, error: null } satisfies ApiResponse<void>, { status: 201 })
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<void>,
      { status: 500 }
    )
  }
}

interface DeleteTripItemBody {
  trip_id: string
  item_id: string
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<void>,
        { status: 401 }
      )
    }

    let body: DeleteTripItemBody
    try {
      body = await request.json() as DeleteTripItemBody
    } catch {
      return Response.json(
        { data: null, error: { code: 'invalid_json', message: 'Invalid JSON body' } } satisfies ApiResponse<void>,
        { status: 400 }
      )
    }

    if (!body.trip_id || typeof body.trip_id !== 'string') {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'trip_id is required' } } satisfies ApiResponse<void>,
        { status: 400 }
      )
    }
    if (!body.item_id || typeof body.item_id !== 'string') {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'item_id is required' } } satisfies ApiResponse<void>,
        { status: 400 }
      )
    }

    // Verify the trip belongs to the authenticated user before deleting
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', body.trip_id)
      .eq('user_id', user.id)
      .single()

    if (tripError || !trip) {
      return Response.json(
        { data: null, error: { code: 'not_found', message: 'Trip not found' } } satisfies ApiResponse<void>,
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from('trip_items')
      .delete()
      .eq('trip_id', body.trip_id)
      .eq('item_id', body.item_id)

    if (deleteError) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<void>,
        { status: 500 }
      )
    }

    return Response.json({ data: null, error: null } satisfies ApiResponse<void>)
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<void>,
      { status: 500 }
    )
  }
}
