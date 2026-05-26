import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test('cluster markers: non-CITY_BBOX destination geocodes and renders', async ({ page }) => {
  const consoleLogs: string[] = []
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => consoleLogs.push(`[PAGEERROR] ${err.message}`))

  // Create an item with a non-CITY_BBOX destination and null coords
  const created = await page.request.post('/api/items', {
    data: { name: 'Test Marker Newark', destination: 'Newark, USA' },
  })
  const createdJson = await created.json()
  const itemId = createdJson.data?.id
  console.log('Created item:', JSON.stringify(createdJson.data))
  expect(itemId).toBeTruthy()

  await page.goto('/map')
  await page.waitForLoadState('networkidle')

  // Poll for markers up to 8s (geocoding is async)
  let markerCount = 0
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500)
    markerCount = await page.evaluate(() => document.querySelectorAll('gmp-advanced-marker').length)
    console.log(`t=${(i + 1) * 0.5}s markers: ${markerCount}`)
    if (markerCount > 0) break
  }

  const mapState = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maps = (window as any).google?.maps
    return { mapsExists: !!maps, importLibraryExists: typeof maps?.importLibrary === 'function' }
  })
  console.log('Map state:', JSON.stringify(mapState))
  console.log('Final marker count:', markerCount)
  console.log('Browser console:\n' + consoleLogs.join('\n'))

  // Clean up item
  await page.request.delete(`/api/items?id=${itemId}`).catch(() => {})

  expect(markerCount).toBeGreaterThan(0)
})

test('geocoding works directly in browser context', async ({ page }) => {
  await page.goto('/map')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  const result = await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maps = (window as any).google?.maps
    if (!maps?.importLibrary) return { error: 'no importLibrary' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lib = await maps.importLibrary('geocoding') as any
    const geocoder = new lib.Geocoder()
    return new Promise((resolve) => {
      geocoder.geocode(
        { address: 'Newark, USA' },
        (results: Array<{ geometry: { location: { lat: () => number; lng: () => number } } }>, status: string) => {
          resolve({
            status,
            lat: results?.[0]?.geometry?.location?.lat(),
            lng: results?.[0]?.geometry?.location?.lng(),
          })
        }
      )
    })
  })
  console.log('Newark geocode:', JSON.stringify(result))
  expect((result as { status: string }).status).toBe('OK')
})
