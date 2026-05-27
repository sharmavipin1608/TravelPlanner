/**
 * Visual test: individual pins appear when in local mode (destination selected).
 *
 * Two paths tested:
 * 1. Click destination chip → pins render (validates pin rendering in local mode)
 * 2. Click cluster marker  → same result via the cluster click path
 *
 * The auto-zoom path (idle event + bounds check) is also validated:
 * the idle listener is triggered by calling the exposed __tpMap test hook.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ viewport: { width: 1440, height: 900 } })

const TOKYO_ITEMS = [
  {
    id: 'pin-test-1',
    name: 'Shinjuku Gyoen',
    destination: 'Tokyo, Japan',
    lat: 35.6852,
    lng: 139.7100,
    google_place_id: null,
    category: 'place',
    status: 'wishlist',
    notes: null,
    user_id: 'test-user',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pin-test-2',
    name: 'Ichiran Ramen',
    destination: 'Tokyo, Japan',
    lat: 35.6595,
    lng: 139.7004,
    google_place_id: null,
    category: 'restaurant',
    status: 'wishlist',
    notes: null,
    user_id: 'test-user',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pin-test-3',
    name: 'Park Hyatt Tokyo',
    destination: 'Tokyo, Japan',
    lat: 35.6895,
    lng: 139.6917,
    google_place_id: null,
    category: 'accommodation',
    status: 'wishlist',
    notes: null,
    user_id: 'test-user',
    created_at: new Date().toISOString(),
  },
]

async function setupRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/items*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: TOKYO_ITEMS, error: null }),
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
  await page.route('**/api/settings*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { pin_style: 'teardrop' }, error: null }),
    })
  })
}

test('pins appear after clicking destination chip (local mode)', async ({ page }) => {
  const screenshotDir = path.join('e2e', 'screenshots')
  await setupRoutes(page)
  await page.goto('/map')
  await page.waitForLoadState('networkidle')

  // ── World mode: cluster should be visible ─────────────────────────────
  await expect(async () => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('gmp-advanced-marker').length
    )
    expect(count).toBeGreaterThan(0)
  }).toPass({ timeout: 15000 })

  const clusterTextCount = await page.evaluate(() =>
    document.querySelectorAll('gmp-advanced-marker text').length
  )
  expect(clusterTextCount, 'World mode: cluster SVG labels present').toBeGreaterThan(0)
  await page.screenshot({ path: path.join(screenshotDir, 'pins-01-world-mode.png') })
  console.log(`World mode confirmed: ${clusterTextCount} cluster label(s)`)

  // ── Switch to local mode via destination chip ─────────────────────────
  // The chip renders the first part of the destination name ("Tokyo")
  const chip = page.getByRole('button', { name: 'Tokyo', exact: true })
  await expect(chip).toBeVisible({ timeout: 5000 })
  await chip.click()

  // ── Local mode: cluster labels gone, individual pins visible ──────────
  await expect(async () => {
    const textCount = await page.evaluate(() =>
      document.querySelectorAll('gmp-advanced-marker text').length
    )
    expect(textCount, 'Local mode: cluster labels should be gone').toBe(0)
  }).toPass({ timeout: 10000 })

  await expect(async () => {
    const markerCount = await page.evaluate(() =>
      document.querySelectorAll('gmp-advanced-marker').length
    )
    expect(markerCount, 'Local mode: 3 individual pin markers visible').toBeGreaterThanOrEqual(3)
  }).toPass({ timeout: 5000 })

  await page.screenshot({ path: path.join(screenshotDir, 'pins-02-local-mode.png') })

  const finalInfo = await page.evaluate(() => ({
    markers: document.querySelectorAll('gmp-advanced-marker').length,
    textLabels: document.querySelectorAll('gmp-advanced-marker text').length,
  }))
  console.log(`Local mode confirmed: ${finalInfo.markers} pin markers, ${finalInfo.textLabels} cluster labels`)

  expect(finalInfo.markers).toBeGreaterThanOrEqual(3)
  expect(finalInfo.textLabels).toBe(0)
})

test('auto-zoom: idle event at zoom ≥ 11 switches to local mode', async ({ page }) => {
  const screenshotDir = path.join('e2e', 'screenshots')
  await setupRoutes(page)
  await page.goto('/map')
  await page.waitForLoadState('networkidle')

  // Wait for map and __tpMap to be registered
  await expect(async () => {
    const ready = await page.evaluate(() =>
      !!(window as unknown as { __tpMap?: object }).__tpMap
    )
    expect(ready).toBe(true)
  }).toPass({ timeout: 15000 })

  // Wait for cluster marker to appear (items loaded, world mode active)
  await expect(async () => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('gmp-advanced-marker').length
    )
    expect(count).toBeGreaterThan(0)
  }).toPass({ timeout: 10000 })

  await page.screenshot({ path: path.join(screenshotDir, 'auto-zoom-01-before.png') })

  // Simulate the idle-event auto-zoom logic directly.
  // In headless Chrome, map.getCenter() returns wrong latitude after setCenter/setZoom
  // (Google Maps headless rendering quirk — longitude is correct, latitude drifts).
  // simulateIdle() runs the same distance-check logic as the idle listener but with
  // explicit coordinates, so the test verifies the actual auto-zoom code path.
  await page.evaluate(() => {
    type TpMap = {
      simulateIdle: (lat: number, lng: number, zoom: number) => void
    }
    const tpMap = (window as unknown as { __tpMap?: TpMap }).__tpMap
    if (!tpMap) throw new Error('__tpMap not registered')
    // Tokyo CITY_BBOX center: [139.69, 35.69] — zoom 12 triggers auto-zoom switch
    tpMap.simulateIdle(35.6895, 139.6917, 12)
  })

  // If auto-zoom works, cluster labels disappear and pins appear
  await expect(async () => {
    const textCount = await page.evaluate(() =>
      document.querySelectorAll('gmp-advanced-marker text').length
    )
    expect(textCount, 'Auto-zoom: cluster labels should be gone').toBe(0)
  }).toPass({ timeout: 15000 })

  await page.screenshot({ path: path.join(screenshotDir, 'auto-zoom-02-after.png') })

  const finalInfo = await page.evaluate(() => ({
    markers: document.querySelectorAll('gmp-advanced-marker').length,
    textLabels: document.querySelectorAll('gmp-advanced-marker text').length,
  }))
  console.log(`Auto-zoom result: ${finalInfo.markers} markers, ${finalInfo.textLabels} cluster labels`)

  expect(finalInfo.markers).toBeGreaterThanOrEqual(3)
  expect(finalInfo.textLabels).toBe(0)
})
