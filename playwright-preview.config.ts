import { defineConfig, devices } from '@playwright/test'

const PREVIEW_URL = process.env.PREVIEW_URL ?? 'https://travel-planner-awu4yxw1b-sharmavipin1608-7337s-projects.vercel.app'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['functional.spec.ts'],
  fullyParallel: false,
  retries: 1,
  globalSetup: './e2e/preview-global-setup.ts',
  use: {
    baseURL: PREVIEW_URL,
    trace: 'on-first-retry',
    storageState: 'e2e/.auth-state-preview.json',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
