import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Trip, ApiResponse } from '@/types'

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<Trip[]>,
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<Trip[]>,
        { status: 500 }
      )
    }

    return Response.json({ data: data as Trip[], error: null } satisfies ApiResponse<Trip[]>)
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<Trip[]>,
      { status: 500 }
    )
  }
}

interface PostTripBody {
  name: string
  destination?: string
  start_date?: string
  end_date?: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json(
        { data: null, error: { code: 'unauthorized', message: 'Not authenticated' } } satisfies ApiResponse<Trip>,
        { status: 401 }
      )
    }

    let body: PostTripBody
    try {
      body = await request.json() as PostTripBody
    } catch {
      return Response.json(
        { data: null, error: { code: 'invalid_json', message: 'Invalid JSON body' } } satisfies ApiResponse<Trip>,
        { status: 400 }
      )
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return Response.json(
        { data: null, error: { code: 'validation_error', message: 'name is required' } } satisfies ApiResponse<Trip>,
        { status: 400 }
      )
    }

    const insertData = {
      user_id: user.id,
      name: body.name.trim(),
      destination: body.destination ?? null,
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
    }

    const { data, error } = await supabase
      .from('trips')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return Response.json(
        { data: null, error: { code: 'db_error', message: 'Internal server error' } } satisfies ApiResponse<Trip>,
        { status: 500 }
      )
    }

    return Response.json({ data: data as Trip, error: null } satisfies ApiResponse<Trip>, { status: 201 })
  } catch {
    return Response.json(
      { data: null, error: { code: 'internal', message: 'Internal server error' } } satisfies ApiResponse<Trip>,
      { status: 500 }
    )
  }
}
