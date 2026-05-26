import type { Category } from '@/types'

const RESTAURANT_TYPES = new Set([
  'cafe', 'restaurant', 'bar', 'bakery', 'food',
  'meal_delivery', 'meal_takeaway', 'coffee_shop', 'fast_food_restaurant',
])
const ACCOMMODATION_TYPES = new Set([
  'lodging', 'hotel', 'motel', 'campground', 'bed_and_breakfast', 'hostel',
])
const PLACE_TYPES = new Set([
  'tourist_attraction', 'museum', 'park', 'amusement_park', 'art_gallery',
  'zoo', 'natural_feature', 'landmark', 'historical_landmark',
  'national_park', 'aquarium', 'church', 'place_of_worship',
])
const ACTIVITY_TYPES = new Set([
  'gym', 'spa', 'stadium', 'golf_course', 'bowling_alley',
  'movie_theater', 'night_club', 'casino', 'ski_resort',
])

export function mapPlaceType(types: string[]): Category | null {
  for (const t of types) {
    if (RESTAURANT_TYPES.has(t)) return 'restaurant'
    if (ACCOMMODATION_TYPES.has(t)) return 'accommodation'
    if (PLACE_TYPES.has(t)) return 'place'
    if (ACTIVITY_TYPES.has(t)) return 'activity'
  }
  return null
}
