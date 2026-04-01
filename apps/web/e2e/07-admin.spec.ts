import { test, expect } from '@playwright/test'
import { requireCreds } from './helpers/auth'

/**
 * Admin panel — full UAT
 * Tests require E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to be set to an org_admin account.
 * Falls back to E2E_EMAIL / E2E_PASSWORD if admin creds not set separately.
 *
 * - Admin panel loads
 * - Members page loads and lists members
 * - Branding page loads and can update name
 * - Module toggles are visible
 */

test.describe('Admin panel', () => {
  test.beforeEach(async ({}) => {
    const reason = requireCreds()
    if (reason) test.skip(true, reason)
  })

  test('admin panel home loads', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('body')).not.toContainText('Application error')
    // If not admin, will be redirected — that's fine, just check no crash
    const url = page.url()
    if (!url.includes('/admin')) test.skip(true, 'User is not admin — skipping admin tests')
  })

  test('admin members page loads and shows members', async ({ page }) => {
    await page.goto('/admin/members')
    if (!page.url().includes('/admin')) test.skip(true, 'Not admin')
    await expect(page.locator('body')).not.toContainText('Application error')
    // Should show at least one member (the admin themselves)
    const body = await page.locator('body').textContent()
    expect(body && body.trim().length > 100).toBeTruthy()
  })

  test('admin branding page loads', async ({ page }) => {
    await page.goto('/admin/branding')
    if (!page.url().includes('/admin')) test.skip(true, 'Not admin')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('can update community name via branding form', async ({ page }) => {
    await page.goto('/admin/branding')
    if (!page.url().includes('/admin')) test.skip(true, 'Not admin')

    const nameInput = page.locator('input[placeholder*="community"], input[id*="name"], input[name*="name"]').first()
    if (await nameInput.count() === 0) test.skip(true, 'No name input on branding page')

    const currentValue = await nameInput.inputValue()
    await nameInput.fill(currentValue || 'My Community') // keep existing or set a value

    const saveBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first()
    await saveBtn.click()

    await expect(page.locator('body')).toContainText(/saved|updated|success/i, { timeout: 10_000 })
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('admin roles page loads', async ({ page }) => {
    await page.goto('/admin/roles')
    if (!page.url().includes('/admin')) test.skip(true, 'Not admin')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('admin moderation page loads', async ({ page }) => {
    await page.goto('/admin/moderation')
    if (!page.url().includes('/admin')) test.skip(true, 'Not admin')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('module toggles are visible on admin home', async ({ page }) => {
    await page.goto('/admin')
    if (!page.url().includes('/admin')) test.skip(true, 'Not admin')
    await expect(page.locator('body')).not.toContainText('Application error')
    // Modules section should exist
    const body = await page.locator('body').textContent()
    const hasModules = body?.toLowerCase().includes('forum') || body?.toLowerCase().includes('module') || body?.toLowerCase().includes('feature')
    expect(hasModules).toBeTruthy()
  })

  test('member invite page loads', async ({ page }) => {
    await page.goto('/admin/members/invite')
    if (!page.url().includes('/admin')) test.skip(true, 'Not admin')
    await expect(page.locator('body')).not.toContainText('Application error')
  })
})
