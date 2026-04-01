import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'https://opensourcecommunity.io'

/**
 * Global setup — runs once before the entire test suite.
 * Logs in as the test user and saves the browser session to disk.
 * All authenticated tests reuse this session instead of logging in per-test,
 * which avoids Supabase rate limits and speeds up the suite significantly.
 */
export default async function globalSetup() {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD

  if (!email || !password) {
    console.log('[global-setup] No E2E credentials — skipping auth session setup')
    return
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"], input[name="email"]', email)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/home|\/forums|\/dashboard|\/ideas|\/events/, { timeout: 30_000 })

    // Save session for regular test user
    await page.context().storageState({ path: 'e2e/.auth/user.json' })
    console.log('[global-setup] ✓ User session saved')
  } catch (err) {
    console.error('[global-setup] Login failed — authenticated tests will be skipped:', err)
    // Write empty state so tests can still run and skip gracefully
    const fs = await import('fs')
    fs.mkdirSync('e2e/.auth', { recursive: true })
    fs.writeFileSync('e2e/.auth/user.json', JSON.stringify({ cookies: [], origins: [] }))
  } finally {
    await browser.close()
  }

  // Admin session (if separate creds provided)
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPassword = process.env.E2E_ADMIN_PASSWORD
  if (adminEmail && adminPassword && adminEmail !== email) {
    const browser2 = await chromium.launch()
    const adminPage = await browser2.newPage()
    try {
      await adminPage.goto(`${BASE_URL}/login`)
      await adminPage.fill('input[type="email"], input[name="email"]', adminEmail)
      await adminPage.fill('input[type="password"], input[name="password"]', adminPassword)
      await adminPage.click('button[type="submit"]')
      await adminPage.waitForURL(/\/home|\/forums|\/dashboard|\/admin/, { timeout: 30_000 })
      await adminPage.context().storageState({ path: 'e2e/.auth/admin.json' })
      console.log('[global-setup] ✓ Admin session saved')
    } catch {
      console.log('[global-setup] Admin login failed — admin tests will be skipped')
    } finally {
      await browser2.close()
    }
  }
}
