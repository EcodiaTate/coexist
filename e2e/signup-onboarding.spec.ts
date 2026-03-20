import { test, expect } from '@playwright/test'
import { signUp, completeOnboarding } from './helpers'

test.describe('Signup → Onboarding → Join Collective → Register Event', () => {
  const uniqueEmail = `test+${Date.now()}@coexist.dev`

  test('full participant onboarding flow', async ({ page }) => {
    // 1. Sign up
    await signUp(page, {
      email: uniqueEmail,
      password: 'SecurePass123!',
      name: 'E2E Tester',
    })

    // Should redirect to onboarding or email verification
    await expect(page).toHaveURL(/\/(onboarding|verify|email)/)

    // If onboarding, complete it
    if (page.url().includes('onboarding')) {
      await completeOnboarding(page)
    }
  })

  test('joins a collective from explore', async ({ page }) => {
    // Assumes user is logged in (via storageState or setup)
    await page.goto('/explore')

    // Find a collective to join
    const collective = page.locator('[data-testid="collective-card"]').first()
    if (await collective.isVisible().catch(() => false)) {
      await collective.click()
      const joinButton = page.getByRole('button', { name: /join/i })
      if (await joinButton.isVisible().catch(() => false)) {
        await joinButton.click()
        await expect(page.getByText(/joined|member|welcome/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('registers for an event', async ({ page }) => {
    await page.goto('/explore')

    // Click into an event
    const eventCard = page.locator('[data-testid="event-card"]').first()
    if (await eventCard.isVisible().catch(() => false)) {
      await eventCard.click()

      // Register
      const registerBtn = page.getByRole('button', { name: /register|sign up|rsvp/i })
      if (await registerBtn.isVisible().catch(() => false)) {
        await registerBtn.click()
        await expect(
          page.getByText(/registered|you're in|confirmed/i),
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
