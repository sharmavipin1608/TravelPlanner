import { chromium, type FullConfig } from '@playwright/test'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of raw.split('\n')) {
      const match = line.match(/^([^#=][^=]*)=(.*)$/)
      if (match) process.env[match[1].trim()] = match[2].trim()
    }
  } catch {
    // .env.local absent
  }
}

export default async function globalSetup(_config: FullConfig) {
  loadEnv()

  const baseURL = process.env.PREVIEW_URL ?? 'https://travel-planner-awu4yxw1b-sharmavipin1608-7337s-projects.vercel.app'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const testEmail = 'playwright@wayfare.test'
  const testPassword = 'PlaywrightTest123!'

  // Ensure test user exists (same Supabase project as dev)
  if (supabaseUrl && serviceRoleKey) {
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(testEmail)}`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    })
    const listData = listRes.ok ? await listRes.json() : { users: [] }
    const existing = (listData.users ?? []).find((u: { email: string }) => u.email === testEmail)
    if (!existing) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ email: testEmail, password: testPassword, email_confirm: true }),
      })
    }
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(`${baseURL}/login`)
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="email"]').fill(testEmail)
  await page.locator('input[type="password"]').fill(testPassword)
  await page.locator('button[type="submit"]').click()

  try {
    await page.waitForURL('**/map', { timeout: 20000 })
  } catch {
    throw new Error(`Login failed on preview URL: ${baseURL}`)
  }

  await page.context().storageState({ path: 'e2e/.auth-state-preview.json' })
  await browser.close()
  console.log(`[preview-setup] Auth state saved for ${baseURL}`)
}
