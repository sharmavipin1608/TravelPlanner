export interface CityBbox {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
  center: [lng: number, lat: number]
}

export const CITY_BBOX: Record<string, CityBbox> = {
  'Tokyo, Japan':        { minLat: 35.53, minLng: 139.56, maxLat: 35.82, maxLng: 139.93, center: [139.69, 35.69] },
  'Paris, France':       { minLat: 48.82, minLng: 2.22,   maxLat: 48.90, maxLng: 2.47,   center: [2.35,   48.86] },
  'Rome, Italy':         { minLat: 41.80, minLng: 12.38,  maxLat: 41.99, maxLng: 12.62,  center: [12.50,  41.90] },
  'Bali, Indonesia':     { minLat: -8.85, minLng: 114.43, maxLat: -8.06, maxLng: 115.71, center: [115.09, -8.41] },
  'Barcelona, Spain':    { minLat: 41.33, minLng: 2.07,   maxLat: 41.47, maxLng: 2.23,   center: [2.15,   41.39] },
  'New York, USA':       { minLat: 40.48, minLng: -74.26, maxLat: 40.93, maxLng: -73.70, center: [-74.01, 40.71] },
  'London, UK':          { minLat: 51.38, minLng: -0.35,  maxLat: 51.67, maxLng: 0.15,   center: [-0.12,  51.51] },
  'Bangkok, Thailand':   { minLat: 13.49, minLng: 100.33, maxLat: 13.96, maxLng: 100.94, center: [100.52, 13.75] },
  'Lisbon, Portugal':    { minLat: 38.69, minLng: -9.23,  maxLat: 38.80, maxLng: -9.09,  center: [-9.14,  38.72] },
  'Amsterdam, Netherlands': { minLat: 52.29, minLng: 4.73, maxLat: 52.44, maxLng: 5.08, center: [4.90,   52.37] },
  'Osaka, Japan':        { minLat: 34.57, minLng: 135.40, maxLat: 34.74, maxLng: 135.65, center: [135.50, 34.69] },
  'Mexico City, Mexico': { minLat: 19.28, minLng: -99.36, maxLat: 19.59, maxLng: -98.94, center: [-99.13, 19.43] },
}
