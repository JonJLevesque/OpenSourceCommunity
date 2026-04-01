import { test, expect } from '@playwright/test'

/**
 * Smoke tests — quick sanity checks that run without credentials.
 * For full UAT coverage see:
 *   01-auth.spec.ts      — login, signup, logout
 *   02-forums.spec.ts    — create threads, reply
 *   03-ideas.spec.ts     — create ideas, vote, comment
 *   04-events.spec.ts    — create events, RSVP
 *   05-courses.spec.ts   — enroll, complete lessons
 *   06-profile.spec.ts   — update profile
 *   07-admin.spec.ts     — admin panel, branding, members
 *   08-navigation.spec.ts — all routes load without crashing
 */

test.describe('Smoke — public pages load', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).not.toContainText('Application error')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('login page renders and has auth form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).not.toContainText('Application error')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('signup page renders and has auth form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('body')).not.toContainText('Application error')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  })

  test('setup page renders without crashing', async ({ page }) => {
    await page.goto('/setup')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('unauthenticated /home redirects away', async ({ page }) => {
    await page.goto('/home')
    // Must redirect — should never render the authenticated home to an unauthed user
    await expect(page).not.toHaveURL('/home', { timeout: 8_000 })
  })

  test('unauthenticated /forums redirects away', async ({ page }) => {
    await page.goto('/forums')
    await expect(page).not.toHaveURL('/forums', { timeout: 8_000 })
  })

  test('404 page renders for unknown route', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz-123')
    const status = page.url()
    await expect(page.locator('body')).not.toContainText('Application error')
    const body = await page.locator('body').textContent()
    const is404 = body?.includes('404') || body?.includes('not found') || body?.includes('Not found') || status.includes('login')
    expect(is404).toBeTruthy()
  })
})
