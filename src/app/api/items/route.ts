import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Item, ApiResponse, Category, Status } from '@/types'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<Item[]>,
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const destination = searchParams.get('destination')
    const category = searchParams.get('category') as Category | null

    let query = supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)

    if (destination) {
      query = query.eq('destination', destination)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<Item[]>,
        { status: 500 }
      )
    }

    return Response.json({ data: data as Item[], error: null } satisfies ApiResponse<Item[]>)
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<Item[]>,
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<Item>,
        { status: 401 }
      )
    }

    let body: { id: string; lat?: number; lng?: number }
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { data: null, error: { code: 'invalid_json', message: 'Invalid JSON body' } } satisfies ApiResponse<Item>,
        { status: 400 }
      )
    }

    if (!body.id) {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'id is required' } } satisfies ApiResponse<Item>,
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('items')
      .update({ lat: body.lat ?? null, lng: body.lng ?? null })
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Item not found or update failed' } } satisfies ApiResponse<Item>,
        { status: 404 }
      )
    }

    return Response.json({ data: data as Item, error: null } satisfies ApiResponse<Item>)
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<Item>,
      { status: 500 }
    )
  }
}

interface PostItemBody {
  name: string
  category?: Category
  google_place_types?: string[]
  destination?: string
  lat?: number
  lng?: number
  google_place_id?: string
  notes?: string
  metadata?: Record<string, unknown>
  status?: Status
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<Item>,
        { status: 401 }
      )
    }

    let body: PostItemBody
    try {
      body = await request.json() as PostItemBody
    } catch {
      return Response.json(
        { data: null, error: { code: 'invalid_json', message: 'Invalid JSON body' } } satisfies ApiResponse<Item>,
        { status: 400 }
      )
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'name is required' } } satisfies ApiResponse<Item>,
        { status: 400 }
      )
    }

    const insertData = {
      user_id: user.id,
      name: body.name.trim(),
      category: body.category ?? null,
      google_place_types: body.google_place_types ?? null,
      destination: body.destination ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      google_place_id: body.google_place_id ?? null,
      notes: body.notes ?? null,
      metadata: body.metadata ?? {},
      status: body.status ?? 'wishlist',
    }

    const { data, error } = await supabase
      .from('items')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<Item>,
        { status: 500 }
      )
    }

    return Response.json({ data: data as Item, error: null } satisfies ApiResponse<Item>, { status: 201 })
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<Item>,
      { status: 500 }
    )
  }
}
