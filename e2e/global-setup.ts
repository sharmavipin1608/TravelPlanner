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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase env vars in .env.local')
  }

  const testEmail = 'playwright@wayfare.test'
  const testPassword = 'PlaywrightTest123!'

  // Ensure test user exists and email is confirmed (uses service role if available)
  if (serviceRoleKey) {
    // List users to check if test user already exists
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(testEmail)}`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    })
    const listData = listRes.ok ? await listRes.json() : { users: [] }
    const existingUser = (listData.users ?? []).find((u: { email: string }) => u.email === testEmail)

    if (!existingUser) {
      // Create confirmed user
      await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ email: testEmail, password: testPassword, email_confirm: true }),
      })
    } else if (!existingUser.email_confirmed_at) {
      // Confirm existing user
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${existingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ email_confirm: true }),
      })
    }
  }

  // Sign in via the UI and save storage state (cookies)
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login')
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="email"]').fill(testEmail)
  await page.locator('input[type="password"]').fill(testPassword)
  // Submit button — type="submit" so the first button with the form is the primary one
  await page.locator('button[type="submit"]').click()

  try {
    await page.waitForURL('**/map', { timeout: 15000 })
  } catch {
    // If sign in failed, try creating account via UI
    const errorText = await page.locator('p').filter({ hasText: /invalid|error|wrong/i }).textContent().catch(() => '')
    if (errorText) {
      // Switch to sign up
      await page.getByRole('button', { name: 'Sign up' }).click()
      await page.locator('input[type="email"]').fill(testEmail)
      await page.locator('input[type="password"]').fill(testPassword)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL('**/map', { timeout: 15000 })
    }
  }

  await page.context().storageState({ path: 'e2e/.auth-state.json' })
  await browser.close()
}
