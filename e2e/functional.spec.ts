import { test, expect, type Page } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

async function goToMap(page: Page) {
  await page.goto('/map')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

test('sidebar: brand mark, CTA, and trips footer visible', async ({ page }) => {
  await goToMap(page)
  await expect(page.getByText('Wayfare')).toBeVisible()
  await expect(page.getByText(/your travel atlas/i)).toBeVisible()
  await expect(page.getByTestId('trips-btn')).toBeVisible()
})

// ── Add a place (manual) → appears in sidebar list ───────────────────────────

test('manual add: place appears in sidebar after save', async ({ page }) => {
  await goToMap(page)

  // Count items before
  const beforeCount = await page.locator('[data-testid="item-row"]').count()

  // Open FAB menu → Add manually
  await page.getByTestId('fab').click()
  await page.waitForTimeout(300)
  await page.getByText('Add manually').click()
  await page.waitForTimeout(300)

  // Fill in name
  const uniqueName = `Test Place ${Date.now()}`
  await page.locator('input[placeholder="e.g. Ahiru Store"]').fill(uniqueName)

  // Pick a category
  await page.getByLabel('Category').selectOption('place')

  // Fill destination
  await page.locator('input[placeholder="e.g. Paris, France"]').fill('Tokyo, Japan')

  // Save
  await page.getByRole('button', { name: /save place/i }).click()
  await page.waitForTimeout(1000)

  // Item should now be in sidebar
  await expect(page.getByText(uniqueName)).toBeVisible()
})

// ── Autocomplete search shows results ─────────────────────────────────────────

test('autocomplete: typing a query shows Google Places results', async ({ page }) => {
  await goToMap(page)

  // Open via sidebar CTA (dark full-width button that goes directly to autocomplete)
  await page.getByTestId('add-place-cta').click()
  await page.waitForTimeout(500)

  // Should show "Save a place" modal
  await expect(page.getByText('Save a place')).toBeVisible()

  // Type a query
  await page.locator('input[placeholder="Start typing a place name..."]').fill('Tsukiji')
  await page.waitForTimeout(1500) // debounce + API call

  // Results should appear (at least one suggestion)
  const results = page.locator('ul li button')
  await expect(results.first()).toBeVisible({ timeout: 5000 })
})

// ── Autocomplete: detail form shows coords indicator ─────────────────────────

test('autocomplete: detail form shows coordinate status after selecting a place', async ({ page }) => {
  await goToMap(page)

  await page.getByTestId('add-place-cta').click()
  await page.waitForTimeout(500)
  await page.locator('input[placeholder="Start typing a place name..."]').fill('Tsukiji Market Tokyo')
  await page.waitForTimeout(1500)

  const results = page.locator('ul li button')
  const count = await results.count()
  if (count === 0) {
    test.skip()
    return
  }

  // Select first result
  await results.first().click()
  await page.waitForTimeout(2000) // wait for PlacesService.getDetails

  // Should show either coords (green) or the no-coords warning (red)
  const coordsIndicator = page.locator('div[style*="font-mono"]').filter({ hasText: /coords:|No coordinates/ })
  await expect(coordsIndicator).toBeVisible({ timeout: 5000 })
})

// ── Trips modal: card-style rows ──────────────────────────────────────────────

test('trips modal: opens and shows card-style UI', async ({ page }) => {
  await goToMap(page)

  // Open trips modal via footer button
  await page.getByTestId('trips-btn').click()
  await page.waitForTimeout(500)

  // Modal heading
  await expect(page.getByRole('heading', { name: 'Trips' })).toBeVisible()
  await expect(page.getByText('Pull from your saved places into a plan.')).toBeVisible()

  // "New trip" row button should be visible
  await expect(page.getByText('New trip')).toBeVisible()
})

test('trips modal: create a trip then trip appears as card', async ({ page }) => {
  await goToMap(page)

  await page.getByTestId('trips-btn').click()
  await page.waitForTimeout(500)

  // Click "New trip"
  await page.getByText('New trip').click()
  await page.waitForTimeout(300)

  // Fill form
  const tripName = `E2E Trip ${Date.now()}`
  await page.locator('input[placeholder*="Trip name"]').fill(tripName)
  await page.locator('input[placeholder*="Destination"]').fill('Kyoto, Japan')

  // Create
  await page.getByRole('button', { name: 'Create trip' }).click()
  await page.waitForTimeout(1000)

  // Should auto-activate the trip and close the modal
  // Active trip pill should appear in sidebar
  await expect(page.getByText(tripName)).toBeVisible({ timeout: 5000 })
})

// ── Add to trip flow ──────────────────────────────────────────────────────────

test('add to trip: item status updates and stays in trip after refresh', async ({ page }) => {
  await goToMap(page)

  // First create a trip
  await page.getByTestId('trips-btn').click()
  await page.waitForTimeout(400)
  await page.getByText('New trip').click()
  const tripName = `Trip for add-test ${Date.now()}`
  await page.locator('input[placeholder*="Trip name"]').fill(tripName)
  await page.getByRole('button', { name: 'Create trip' }).click()
  await page.waitForTimeout(1000)

  // Add a manual place via FAB → "Add manually"
  await page.getByTestId('fab').click()
  await page.waitForTimeout(300)
  await page.getByText('Add manually').click()
  await page.waitForTimeout(300)
  const placeName = `Trippable Place ${Date.now()}`
  await page.locator('input[placeholder="e.g. Ahiru Store"]').fill(placeName)
  await page.getByLabel('Category').selectOption('place')
  await page.getByRole('button', { name: /save place/i }).click()
  await page.waitForTimeout(1000)

  // Click the item to select it (should open the item card)
  await page.getByText(placeName).click()
  await page.waitForTimeout(500)

  // ItemCard should show with "Add to trip" button
  const addToTripBtn = page.getByRole('button', { name: /add to trip|in trip/i })
  if (await addToTripBtn.count() > 0) {
    await addToTripBtn.click()
    await page.waitForTimeout(1500)

    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Trip should still exist in DB — open modal and activate it
    await page.getByTestId('trips-btn').click()
    await page.waitForTimeout(500)
    await expect(page.getByText(tripName)).toBeVisible({ timeout: 5000 })

    // Re-activate the trip — item count must load from DB (not stay at 0)
    await page.locator('button').filter({ hasText: tripName }).first().click()
    await page.waitForTimeout(1000)

    // tripItemCount > 0 means activateTrip() correctly fetched items from DB
    const tripsBtnText = await page.getByTestId('trips-btn').textContent()
    const count = parseInt(tripsBtnText?.replace(/\D/g, '') ?? '0', 10)
    expect(count).toBeGreaterThan(0)
  }
})

// ── Scratchpad: entry appears and can be discarded ───────────────────────────

test('scratchpad: text entry appears and discard removes it', async ({ page }) => {
  await goToMap(page)

  // Open scratchpad via FAB
  await page.getByTestId('fab').click()
  await page.waitForTimeout(300)
  await page.getByText('Scratchpad').first().click()
  await page.waitForTimeout(500)

  await expect(page.getByRole('heading', { name: 'Scratchpad' })).toBeVisible()

  // Type an entry
  const note = `Test note ${Date.now()}`
  await page.locator('textarea').fill(note)
  await page.getByTestId('scratchpad-sort-btn').click()
  await page.waitForTimeout(500)

  // Entry should appear
  await expect(page.getByText(note, { exact: false })).toBeVisible()

  // Discard it
  await page.getByText('discard').first().click()
  await page.waitForTimeout(300)

  // Entry should be gone
  await expect(page.getByText(note, { exact: false })).not.toBeVisible()
})
