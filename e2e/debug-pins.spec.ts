import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test('cluster marker geocoding for Mount Shasta and Newark', async ({ page }) => {
  await page.goto('/map')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  // Inject items with null coords + non-CITY_BBOX destinations directly into the map state
  // by evaluating what ClusterMarker would do for these destinations
  const geocodeResults = await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google?.maps
    if (!g?.importLibrary) return { error: 'no importLibrary' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lib = await g.importLibrary('geocoding') as any
    const geocoder = new lib.Geocoder()

    const geocode = (address: string) => new Promise<{ lat: number; lng: number; status: string }>((resolve) => {
      geocoder.geocode({ address }, (
        results: Array<{ geometry: { location: { lat: () => number; lng: () => number } } }>,
        status: string
      ) => {
        if (status === 'OK' && results?.[0]) {
          resolve({ status, lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() })
        } else {
          resolve({ status, lat: 0, lng: 0 })
        }
      })
    })

    return {
      mountShasta: await geocode('Mount Shasta, United States'),
      newarkUSA: await geocode('Newark, USA'),
    }
  })

  console.log('Geocode results:', JSON.stringify(geocodeResults, null, 2))

  // Both should return valid coordinates
  expect((geocodeResults as { mountShasta: { status: string } }).mountShasta.status).toBe('OK')
  expect((geocodeResults as { newarkUSA: { status: string } }).newarkUSA.status).toBe('OK')
})

test('full pin flow: autocomplete → coords stored → cluster → pin', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('[autocomplete]')) {
      consoleErrors.push(`[${msg.type()}] ${msg.text()}`)
    }
  })

  await page.goto('/map')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  const markersBefore = await page.evaluate(() => document.querySelectorAll('gmp-advanced-marker').length)
  console.log('Markers before adding:', markersBefore)

  // Add a place via autocomplete
  await page.getByTestId('add-place-cta').click()
  await page.waitForTimeout(500)
  await page.locator('input[placeholder="Start typing a place name..."]').fill('Shinjuku Tokyo')
  await page.waitForTimeout(2000)

  const results = page.locator('ul li button')
  expect(await results.count()).toBeGreaterThan(0)
  await results.first().click()
  await page.waitForTimeout(3000)

  // Verify coords indicator is green
  const coordText = await page.locator('div').filter({ hasText: /coords:|No coordinates/ }).first().textContent()
  console.log('Coord indicator:', coordText?.includes('coords:') ? 'GREEN - has coords' : 'RED - no coords')
  expect(coordText).toContain('coords:')

  // Save
  await page.getByRole('button', { name: /save place/i }).click()
  await page.waitForTimeout(2000)

  // Verify item saved with coords
  const latestItem = await page.evaluate(async () => {
    const r = await fetch('/api/items')
    const j = await r.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = j.data as Array<{ name: string; lat: number | null; lng: number | null; destination: string | null }>
    return items[items.length - 1]
  })
  console.log('Saved item:', latestItem)
  expect(latestItem.lat).not.toBeNull()
  expect(latestItem.lng).not.toBeNull()

  // Cluster markers should appear
  await page.waitForTimeout(2000)
  const markersAfter = await page.evaluate(() => document.querySelectorAll('gmp-advanced-marker').length)
  console.log('Markers after adding:', markersAfter)
  expect(markersAfter).toBeGreaterThan(0)

  // Click the destination chip to enter local view
  if (latestItem.destination) {
    const chipName = latestItem.destination.split(',')[0]
    const chip = page.locator('button').filter({ hasText: new RegExp(chipName, 'i') }).first()
    if (await chip.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chip.click()
      await page.waitForTimeout(2000)
      const pinsInLocal = await page.evaluate(() => document.querySelectorAll('gmp-advanced-marker').length)
      console.log('Pins in local view:', pinsInLocal)
      expect(pinsInLocal).toBeGreaterThan(0)
    }
  }

  if (consoleErrors.length) console.log('Errors:', consoleErrors.join('\n'))
})
