export type Category = 'place' | 'restaurant' | 'accommodation' | 'activity'
export type Status = 'wishlist' | 'planned' | 'visited'

export interface Item {
  id: string
  user_id: string
  name: string
  category: Category | null
  google_place_types: string[] | null
  destination: string | null
  lat: number | null
  lng: number | null
  google_place_id: string | null
  notes: string | null
  metadata: Record<string, unknown>
  status: Status
  created_at: string
}

export interface Trip {
  id: string
  user_id: string
  name: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface TripItem {
  trip_id: string
  item_id: string
  notes: string | null
  day_number: number | null
}

export interface ScratchpadEntry {
  id: string
  user_id: string
  raw_text: string
  processed: boolean
  created_item_id: string | null
  created_at: string
}

export interface ApiResponse<T> {
  data: T | null
  error: { code: string; message: string } | null
}
