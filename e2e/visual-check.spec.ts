import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'e2e/screenshots')

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
})

test.use({ viewport: { width: 1440, height: 900 } })

async function goToMap(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto('/map')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000) // let map tiles settle
}

test('00 - full page', async ({ page }) => {
  await goToMap(page)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/00-full-page.png` })
})

test('01 - sidebar — brand + "Your Travel Atlas" subtitle + footer', async ({ page }) => {
  await goToMap(page)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-sidebar.png` })

  await expect(page.getByText('Wayfare')).toBeVisible()
  // Subtitle — case-insensitive
  await expect(page.getByText(/your travel atlas/i)).toBeVisible()
  // Footer Trips button
  await expect(page.getByRole('button', { name: /open trips/i })).toBeVisible()
  await expect(page.getByText('Trips')).toBeVisible()
})

test('02 - add menu — 3 items with labels + subtitles', async ({ page }) => {
  await goToMap(page)
  // FAB aria-label is 'Add a place'
  await page.getByRole('button', { name: 'Add a place' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-add-menu.png` })

  await expect(page.getByText('Search a place')).toBeVisible()
  await expect(page.getByRole('button', { name: /Scratchpad/ }).filter({ hasText: 'Type anything' })).toBeVisible()
  await expect(page.getByText('Add manually')).toBeVisible()
  await expect(page.getByText('Autocomplete from Google · auto-categorized')).toBeVisible()
  await expect(page.getByText('Type anything · AI sorts it')).toBeVisible()
  await expect(page.getByText('Name + category · for offline notes')).toBeVisible()
})

test('03 - save a place — salmon header + helper text + placeholder', async ({ page }) => {
  await goToMap(page)
  await page.getByRole('button', { name: 'Add a place' }).click()
  await page.waitForTimeout(200)
  await page.getByText('Search a place').click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-autocomplete-add.png` })

  await expect(page.getByText('Save a place')).toBeVisible()
  await expect(page.getByText('Pulls name, coords, hours and type from Google.')).toBeVisible()
  await expect(page.getByPlaceholder('Start typing a place name...')).toBeVisible()
  await expect(page.getByText(/Type to search\. We use Google Places/)).toBeVisible()
})

test('04 - scratchpad — green header + side-by-side compose + hint', async ({ page }) => {
  await goToMap(page)
  await page.getByRole('button', { name: 'Add a place' }).click()
  await page.waitForTimeout(200)
  // Click the 'Scratchpad' menu item (first one that's inside the menu)
  await page.getByText('Scratchpad').first().click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-scratchpad.png` })

  await expect(page.getByRole('heading', { name: 'Scratchpad' })).toBeVisible()
  await expect(page.getByText('Dump anything')).toBeVisible()
  await expect(page.getByRole('button', { name: /sort it/i })).toBeVisible()
  await expect(page.getByText(/⌘\+Enter to categorize/)).toBeVisible()
})

test('05 - settings — map style grid + subtitle + pin rename + segmented controls', async ({ page }) => {
  await goToMap(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-settings.png` })

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByText('Customize how Wayfare looks and feels.')).toBeVisible()
  await expect(page.getByText('Map Style')).toBeVisible()
  await expect(page.getByText('Paper')).toBeVisible()
  await expect(page.getByText('Cool')).toBeVisible()
  await expect(page.getByText('Dusk')).toBeVisible()
  await expect(page.getByText('Satellite')).toBeVisible()
  await expect(page.getByRole('button', { name: /📍 Pin/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /🔴 Dot/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /⭕ Ring/ })).toBeVisible()
})

test('06 - add manually — skips search, shows detail form', async ({ page }) => {
  await goToMap(page)
  await page.getByRole('button', { name: 'Add a place' }).click()
  await page.waitForTimeout(200)
  await page.getByText('Add manually').click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-add-manually.png` })

  // Should show the detail form (name field) without requiring a search
  // manualMode skips search, goes straight to detail form — check for Save place button
  await expect(page.getByRole('button', { name: /save place/i })).toBeVisible()
})
