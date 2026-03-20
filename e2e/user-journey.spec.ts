import { test, expect } from '@playwright/test'

/**
 * E2E test skeletons for critical user journeys.
 * These tests require a running dev server and (ideally) a seeded
 * Supabase instance. Marked as .skip until the full test environment
 * is configured.
 */

test.describe('Participant journey', () => {
  test.skip('signup → onboarding → join collective → register event', async ({ page }) => {
    // 1. Navigate to signup
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible()

    // 2. Fill signup form
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('TestPassword123!')
    await page.getByRole('button', { name: /sign up|create account/i }).click()

    // 3. Complete onboarding steps
    await expect(page).toHaveURL(/\/onboarding/)
    // Fill name
    await page.getByLabel(/name/i).fill('Test User')
    await page.getByRole('button', { name: /next|continue/i }).click()

    // Select interests
    await page.getByText(/tree planting/i).click()
    await page.getByRole('button', { name: /next|continue/i }).click()

    // Select location
    await page.getByLabel(/location/i).fill('Byron Bay')
    await page.getByRole('button', { name: /next|continue/i }).click()

    // Join collective
    await page.getByText(/byron bay/i).click()
    await page.getByRole('button', { name: /join|next|continue/i }).click()

    // 4. Should land on home
    await expect(page).toHaveURL('/')

    // 5. Browse and register for an event
    await page.getByRole('link', { name: /explore/i }).click()
    await page.getByText(/beach cleanup/i).first().click()
    await page.getByRole('button', { name: /register/i }).click()
    await expect(page.getByText(/registered|you're in/i)).toBeVisible()
  })
})

test.describe('Leader journey', () => {
  test.skip('create event → manage attendance → log impact', async ({ page }) => {
    // Assumes leader is already authenticated via storageState or login helper
    await page.goto('/')

    // 1. Create event
    await page.goto('/events/create')
    await page.getByLabel(/title/i).fill('Byron Bay Beach Cleanup')
    await page.getByLabel(/description/i).fill('Monthly beach cleanup at Main Beach')
    // Select activity type
    await page.getByLabel(/activity type/i).selectOption('beach_cleanup')
    // Set date
    await page.getByLabel(/date/i).fill('2026-04-15')
    // Set location
    await page.getByLabel(/address/i).fill('Main Beach, Byron Bay')
    // Submit
    await page.getByRole('button', { name: /create|publish/i }).click()
    await expect(page.getByText(/event created|published/i)).toBeVisible()

    // 2. Manage attendance — check-in a participant
    await page.getByRole('link', { name: /manage|attendance/i }).click()
    await page.getByRole('button', { name: /check in/i }).first().click()
    await expect(page.getByText(/checked in/i)).toBeVisible()

    // 3. Log impact
    await page.getByRole('link', { name: /log impact/i }).click()
    await page.getByLabel(/bags of rubbish/i).fill('12')
    await page.getByLabel(/volunteers/i).fill('25')
    await page.getByRole('button', { name: /submit|save/i }).click()
    await expect(page.getByText(/impact logged|saved/i)).toBeVisible()
  })
})
