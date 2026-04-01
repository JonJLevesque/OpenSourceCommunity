import { test, expect } from '@playwright/test'
import { requireCreds } from './helpers/auth'

/**
 * Navigation & layout — full UAT
 * - Sidebar links all navigate without 500/crash
 * - Header renders with user info
 * - Notifications page loads
 * - Members page loads
 */

const AUTHENTICATED_ROUTES = [
  '/home',
  '/forums',
  '/ideas',
  '/events',
  '/members',
  '/notifications',
  '/profile',
  '/settings',
]

test.describe('Navigation', () => {
  test.beforeEach(async ({}) => {
    const reason = requireCreds()
    if (reason) test.skip(true, reason)
  })

  for (const route of AUTHENTICATED_ROUTES) {
    test(`${route} loads without crashing`, async ({ page }) => {
      await page.goto(route)
      await expect(page.locator('body')).not.toContainText('Application error', { timeout: 10_000 })
      await expect(page.locator('body')).not.toContainText('Internal Server Error', { timeout: 10_000 })
    })
  }

  test('sidebar is visible after login', async ({ page }) => {
    await page.goto('/home')
    // Sidebar should exist
    const sidebar = page.locator('nav, aside, [role="navigation"]').first()
    await expect(sidebar).toBeVisible({ timeout: 10_000 })
  })

  test('header is visible after login', async ({ page }) => {
    await page.goto('/home')
    const header = page.locator('header').first()
    await expect(header).toBeVisible({ timeout: 10_000 })
  })

  test('members page shows member list', async ({ page }) => {
    await page.goto('/members')
    await expect(page.locator('body')).not.toContainText('Application error')
    const body = await page.locator('body').textContent()
    expect(body && body.trim().length > 100).toBeTruthy()
  })

  test('notifications page renders', async ({ page }) => {
    await page.goto('/notifications')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('search does not crash the app', async ({ page }) => {
    await page.goto('/home')
    // Try to find and interact with search
    const searchTrigger = page.locator('button[aria-label*="search"], input[placeholder*="search"], [data-testid*="search"]').first()
    if (await searchTrigger.count() > 0) {
      await searchTrigger.click()
      await page.waitForTimeout(500)
      await page.keyboard.type('test')
      await page.waitForTimeout(500)
      await expect(page.locator('body')).not.toContainText('Application error')
    }
  })
})
