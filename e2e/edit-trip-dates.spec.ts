import { test, expect } from '@playwright/test'

test('inline date editing persists after reload', async ({ page }) => {
  // 1. Create a trip via API
  await page.goto('/map')
  await page.waitForLoadState('networkidle')

  const tripName = `Date Edit Test ${Date.now()}`
  const tripRes = await page.request.post('/api/trips', {
    data: { name: tripName },
  })
  const trip = (await tripRes.json()).data
  console.log('Created trip:', trip?.id, trip?.name)
  expect(trip?.id).toBeTruthy()

  try {
    // 2. Open the trips modal
    await page.getByTestId('trips-btn').click()
    await page.waitForTimeout(500)

    // 3. Find the trip row (by name text) and click the pencil icon
    const tripRow = page.locator('button').filter({ hasText: tripName }).first()
    await expect(tripRow).toBeVisible()

    const pencilBtn = tripRow.locator('button[title="Edit dates"]')
    await pencilBtn.click()

    // 4. Fill in start and end dates
    const startInput = tripRow.locator('input[type="date"]').first()
    const endInput = tripRow.locator('input[type="date"]').nth(1)

    await startInput.fill('2026-08-01')
    await endInput.fill('2026-08-15')

    // 5. Click Save
    const saveBtn = tripRow.locator('button', { hasText: 'Save' })
    await saveBtn.click()
    await page.waitForTimeout(500)

    // 6. Verify dates are shown in the row (non-editing view)
    await expect(tripRow).toContainText('2026-08-01')
    await expect(tripRow).toContainText('2026-08-15')

    // 7. Verify dates persisted in DB via API
    const getRes = await page.request.get(`/api/trips/${trip.id}`)
    const getJson = await getRes.json()
    console.log('Trip after save:', getJson.data)
    expect(getJson.data?.start_date).toBe('2026-08-01')
    expect(getJson.data?.end_date).toBe('2026-08-15')

    // 8. Reload page and verify dates are still visible
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Re-open trips modal
    await page.getByTestId('trips-btn').click()
    await page.waitForTimeout(500)

    const tripRowAfterReload = page.locator('button').filter({ hasText: tripName }).first()
    await expect(tripRowAfterReload).toContainText('2026-08-01')
    await expect(tripRowAfterReload).toContainText('2026-08-15')
  } finally {
    // Clean up
    await page.request.delete(`/api/trips/${trip.id}`).catch(() => {})
  }
})

test('cancel date editing reverts to original dates', async ({ page }) => {
  // 1. Create a trip with existing dates via API
  await page.goto('/map')
  await page.waitForLoadState('networkidle')

  const tripName = `Cancel Edit Test ${Date.now()}`
  const tripRes = await page.request.post('/api/trips', {
    data: { name: tripName, start_date: '2026-09-01', end_date: '2026-09-10' },
  })
  const trip = (await tripRes.json()).data
  console.log('Created trip:', trip?.id, trip?.name)
  expect(trip?.id).toBeTruthy()

  try {
    // 2. Open trips modal
    await page.getByTestId('trips-btn').click()
    await page.waitForTimeout(500)

    // 3. Click the pencil icon
    const tripRow = page.locator('button').filter({ hasText: tripName }).first()
    await expect(tripRow).toBeVisible()

    const pencilBtn = tripRow.locator('button[title="Edit dates"]')
    await pencilBtn.click()

    // 4. Change dates but then cancel
    const startInput = tripRow.locator('input[type="date"]').first()
    await startInput.fill('2026-11-01')

    const cancelBtn = tripRow.locator('button', { hasText: 'Cancel' })
    await cancelBtn.click()
    await page.waitForTimeout(300)

    // 5. Verify original dates are still shown (editing was cancelled)
    await expect(tripRow).toContainText('2026-09-01')
    await expect(tripRow).toContainText('2026-09-10')
  } finally {
    // Clean up
    await page.request.delete(`/api/trips/${trip.id}`).catch(() => {})
  }
})
