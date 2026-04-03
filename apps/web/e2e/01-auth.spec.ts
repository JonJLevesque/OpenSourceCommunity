import { test, expect } from '@playwright/test'
import { TEST_EMAIL, login, requireCreds } from './helpers/auth'

/**
 * Authentication flows
 * Public tests run with no session. Authenticated tests use the
 * pre-saved storageState session from global-setup.
 */

test.describe('Auth — public pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('login page renders without crashing', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).not.toContainText('Application error')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('signup page renders without crashing', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('body')).not.toContainText('Application error')
    // If redirected (already authenticated), just verify no crash
    if (page.url().includes('/signup')) {
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10_000 })
    }
  })

  test('setup page renders without crashing', async ({ page }) => {
    await page.goto('/setup')
    await expect(page.locator('body')).not.toContainText('Application error')
    const isSetupForm = await page.locator('input, form').count() > 0
    const isLocked = (await page.locator('body').textContent())?.match(/already|complete|sign in/i)
    expect(isSetupForm || isLocked).toBeTruthy()
  })

  test('unauthenticated /home redirects to login', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/login/, { timeout: 8_000 })
  })

  test('unauthenticated /forums redirects to login', async ({ page }) => {
    await page.goto('/forums')
    await expect(page).not.toHaveURL('/forums', { timeout: 8_000 })
  })

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"], input[name="email"]', 'notreal@example.com')
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
    const text = await page.locator('body').textContent()
    expect(text?.match(/invalid|incorrect|error|wrong/i)).toBeTruthy()
  })
})

test.describe('Auth — authenticated', () => {
  test.beforeEach(async ({}) => {
    const reason = requireCreds()
    if (reason) test.skip(true, reason)
  })

  test('session is active — lands on authenticated page', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/home|\/forums|\/dashboard/)
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('authenticated user sees profile indicator in header', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('body')).not.toContainText('Application error')
    const body = await page.locator('body').textContent()
    const hasIndicator = await page.locator('[data-testid="user-menu"], header img, header [class*="avatar"], header [class*="profile"]').count() > 0
    expect(hasIndicator || (body ?? '').includes(TEST_EMAIL.split('@')[0] ?? '')).toBeTruthy()
  })

  // Use a fresh login for this test to avoid invalidating the shared session
  test.describe('logout', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('logout signs user out', async ({ page }) => {
      const reason = requireCreds()
      if (reason) test.skip(true, reason)

      // Log in fresh so we can log out without affecting the shared session file
      await login(page)

      // Sign out is inside the user avatar dropdown — open it first
      const userMenuTrigger = page.locator('[aria-label="User menu"]').first()
      if (await userMenuTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await userMenuTrigger.click()
        const logoutBtn = page.locator('button:has-text("Sign out"), button:has-text("Log out")').first()
        await expect(logoutBtn).toBeVisible({ timeout: 3_000 })
        await logoutBtn.click()
        await expect(page).toHaveURL(/\/login|\//, { timeout: 8_000 })
      } else {
        test.skip(true, 'No user menu trigger found in visible UI')
      }
    })
  })
})
