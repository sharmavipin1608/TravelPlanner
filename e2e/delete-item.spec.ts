import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test('delete item — removes from list and does not reappear on reload', async ({ page, request }) => {
  // 1. Create an item via API
  const res = await request.post('/api/items', {
    data: {
      name: 'E2E Delete Test Item',
      category: 'place',
      destination: 'Test City',
      lat: 35.68,
      lng: 139.69,
      google_place_id: 'test-e2e-delete-001',
    },
  })
  expect(res.ok()).toBeTruthy()
  const { data: item } = await res.json()
  expect(item).toBeTruthy()

  // 2. Load the map
  await page.goto('/map')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // 3. Find the item row — no active trip means the red × delete button is always visible
  const itemRow = page.locator('[data-testid="item-row"]').filter({ hasText: 'E2E Delete Test Item' })
  await expect(itemRow).toBeVisible()

  // Click the delete button inside the row
  await itemRow.locator('button').click()

  // 4. Confirm dialog appears
  await expect(page.getByText('Delete E2E Delete Test Item?')).toBeVisible()

  // 5. Click the red Delete button
  await page.getByRole('button', { name: 'Delete' }).click()

  // 6. Item disappears from sidebar
  await expect(page.locator('[data-testid="item-row"]').filter({ hasText: 'E2E Delete Test Item' })).not.toBeVisible()

  // 7. Reload and verify it's gone (round-trip persistence)
  await page.goto('/map')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  await expect(page.locator('[data-testid="item-row"]').filter({ hasText: 'E2E Delete Test Item' })).not.toBeVisible()
})
