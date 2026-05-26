/**
 * Regression test for: cluster markers render with empty div when position transitions
 * null→coords via geocoding.
 *
 * Root cause: AdvancedMarker creates its portal container via a useEffect (async), so the
 * content div only mounts on the SECOND render after geocoding — by which point the old
 * innerHTML useEffect's deps were unchanged and did not re-run. Fixed by using a ref callback
 * that fires on the div's actual mount.
 */
import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test('cluster marker SVG is present after geocoding a non-CITY_BBOX destination', async ({ page }) => {
  // Return a single item with null coords and no google_place_id for a non-CITY_BBOX destination.
  // This forces ClusterMarker to geocode, then set innerHTML on the newly-mounted div via portal.
  await page.route('**/api/items*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'cluster-svg-test-1',
              name: 'Test Place',
              destination: 'Newark, NJ, USA',
              lat: null,
              lng: null,
              google_place_id: null,
              category: 'place',
              status: 'wishlist',
              notes: null,
              user_id: 'test-user',
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
        }),
      })
    } else {
      route.continue()
    }
  })

  await page.route('**/api/trips*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], error: null }),
    })
  })

  const consoleLogs: string[] = []
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))

  await page.goto('/map')
  await page.waitForLoadState('networkidle')

  // Poll for SVG path elements (pie slices from clusterHTML) for up to 10s.
  // We check document.body for SVG paths rather than gmp-advanced-marker descendants
  // because AdvancedMarker places content via a portal — the div may not be a DOM
  // descendant of the gmp-advanced-marker element depending on Maps API version.
  let svgPathCount = 0
  let markerCount = 0
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500)
    markerCount = await page.evaluate(() =>
      document.querySelectorAll('gmp-advanced-marker').length
    )
    // clusterHTML outputs <path> elements inside <svg> — check whole document
    svgPathCount = await page.evaluate(() =>
      document.querySelectorAll('svg path').length
    )
    if (svgPathCount > 0) break
  }

  if (svgPathCount === 0) {
    // Diagnostic: dump marker innerHTML and any errors
    const markerInfo = await page.evaluate(() => {
      const markers = Array.from(document.querySelectorAll('gmp-advanced-marker'))
      return markers.map(m => ({
        innerHTML: m.innerHTML.slice(0, 200),
        childCount: m.childElementCount,
      }))
    })
    console.log('Marker DOM info:', JSON.stringify(markerInfo, null, 2))
    console.log('Console errors:', consoleLogs.filter(l => l.includes('error') || l.includes('Error')).join('\n'))
  }

  // The AdvancedMarker element must exist in DOM (geocoding + position set)
  expect(markerCount, 'gmp-advanced-marker element must exist after geocoding').toBeGreaterThan(0)
  // The SVG pie slice path must be present (div innerHTML was populated, marker is visible)
  expect(svgPathCount, 'Cluster SVG path must be present — empty div = invisible marker').toBeGreaterThan(0)
})
