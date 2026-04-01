import { defineConfig, devices } from '@playwright/test'

// Default to the live hosted app. Override with BASE_URL env var for staging/local.
const BASE_URL = process.env.BASE_URL ?? 'https://opensourcecommunity.io'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4, // limit parallelism to avoid auth rate limits
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/helpers/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    storageState: 'e2e/.auth/user.json', // reuse session — no per-test logins
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      // Public/unauthenticated tests — explicitly clear any stored session
      name: 'public',
      testMatch: /smoke\.spec\.ts/,
      use: { storageState: { cookies: [], origins: [] } },
    },
    {
      // All authenticated tests — share the saved session
      name: 'authenticated',
      testIgnore: /smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
})
