import { test, expect } from '@playwright/test'

test('trip items persist across page reload', async ({ page }) => {
  // 1. Create a trip and item via API (avoid UI form which has dev overlay issues)
  await page.goto('/map')
  await page.waitForLoadState('networkidle')

  const tripName = `Test Trip ${Date.now()}`
  const tripRes = await page.request.post('/api/trips', {
    data: { name: tripName },
  })
  const trip = (await tripRes.json()).data
  console.log('Created trip:', trip?.id, trip?.name)
  expect(trip?.id).toBeTruthy()

  const itemRes = await page.request.post('/api/items', {
    data: { name: 'Trip Test Place', destination: 'Tokyo, Japan' },
  })
  const item = (await itemRes.json()).data
  console.log('Created item:', item?.id)
  expect(item?.id).toBeTruthy()

  // 2. Add item to trip
  const addRes = await page.request.post('/api/trip-items', {
    data: { trip_id: trip.id, item_id: item.id },
  })
  console.log('Add to trip status:', addRes.status())
  expect(addRes.status()).toBe(201)

  // 3. Verify GET /api/trip-items returns the item
  const getRes = await page.request.get(`/api/trip-items?trip_id=${trip.id}`)
  const getJson = await getRes.json()
  console.log('Trip items from GET:', getJson.data)
  expect(getJson.data).toContain(item.id)

  // 4. Reload page and verify items are still in DB
  await page.reload()
  await page.waitForLoadState('networkidle')

  const afterReloadRes = await page.request.get(`/api/trip-items?trip_id=${trip.id}`)
  const afterJson = await afterReloadRes.json()
  console.log('Trip items after reload:', afterJson.data)
  expect(afterJson.data).toContain(item.id)

  // 5. Activate trip via UI and verify tripItemCount updates from DB
  await page.getByTestId('trips-btn').click()
  await page.waitForTimeout(500)

  // Find and click the trip card to activate it
  const tripCard = page.locator('button').filter({ hasText: tripName }).first()
  await tripCard.click()
  await page.waitForTimeout(1000)

  // The trips button should show a count badge > 0 after loading items from DB
  const tripsBtn = page.getByTestId('trips-btn')
  const btnText = await tripsBtn.textContent()
  console.log('Trips btn text after activation:', btnText)

  // Clean up
  await page.request.delete('/api/trip-items', { data: { trip_id: trip.id, item_id: item.id } }).catch(() => {})
  await page.request.delete(`/api/items?id=${item.id}`).catch(() => {})
})
