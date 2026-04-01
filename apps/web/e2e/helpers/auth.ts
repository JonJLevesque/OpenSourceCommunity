import type { Page } from '@playwright/test'

export const TEST_EMAIL = process.env.E2E_EMAIL ?? ''
export const TEST_PASSWORD = process.env.E2E_PASSWORD ?? ''
export const TEST_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? TEST_EMAIL
export const TEST_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? TEST_PASSWORD

export function requireCreds() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    return 'E2E_EMAIL / E2E_PASSWORD not set — skipping authenticated tests'
  }
  return null
}

/**
 * Performs a full browser login. Only used in global-setup.ts.
 * All tests use the pre-saved storageState session instead.
 */
export async function login(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/login')
  await page.fill('input[type="email"], input[name="email"]', email)
  await page.fill('input[type="password"], input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/home|\/forums|\/dashboard|\/ideas|\/events/, { timeout: 30_000 })
}

export async function loginAsAdmin(page: Page) {
  await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)
}
