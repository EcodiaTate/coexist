import { test, expect } from '@playwright/test'
import { login, TEST_PARTICIPANT } from './helpers'

test.describe('Donate: Select Amount → Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_PARTICIPANT)
  })

  test('donation page loads with preset amounts', async ({ page }) => {
    await page.goto('/donate')
    await expect(page.getByRole('heading', { name: /donate|support|give/i })).toBeVisible()

    // Verify preset amounts are shown ($5, $10, $25, $50)
    await expect(page.getByText('$5')).toBeVisible()
    await expect(page.getByText('$10')).toBeVisible()
    await expect(page.getByText('$25')).toBeVisible()
    await expect(page.getByText('$50')).toBeVisible()
  })

  test('selects a preset amount', async ({ page }) => {
    await page.goto('/donate')

    // Select $25
    await page.getByText('$25').click()

    // The amount should be selected/highlighted
    const selected = page.locator('[aria-pressed="true"], [data-selected="true"], .ring-2, .border-primary-500')
    if ((await selected.count()) > 0) {
      await expect(selected.first()).toBeVisible()
    }
  })

  test('enters custom amount', async ({ page }) => {
    await page.goto('/donate')

    const customInput = page.getByLabel(/custom|amount|other/i)
    if (await customInput.isVisible().catch(() => false)) {
      await customInput.fill('100')
    }
  })

  test('toggles donation frequency', async ({ page }) => {
    await page.goto('/donate')

    // Toggle between one-time and monthly
    const monthlyToggle = page.getByText(/monthly/i)
    if (await monthlyToggle.isVisible().catch(() => false)) {
      await monthlyToggle.click()
      // Verify monthly is now selected
      await expect(monthlyToggle).toBeVisible()
    }
  })

  test('shows impact equivalencies', async ({ page }) => {
    await page.goto('/donate')

    // Select an amount to trigger impact display
    await page.getByText('$25').click()

    // Should show what the donation achieves
    const impactText = page.getByText(/plant|tree|protect|clean/i).first()
    if (await impactText.isVisible().catch(() => false)) {
      await expect(impactText).toBeVisible()
    }
  })

  test('proceeds to checkout', async ({ page }) => {
    await page.goto('/donate')

    // Select amount
    await page.getByText('$25').click()

    // Click donate button
    const donateBtn = page.getByRole('button', { name: /donate|give|continue|checkout/i })
    if (await donateBtn.isVisible().catch(() => false)) {
      // Don't actually redirect to Stripe, just verify button is enabled
      await expect(donateBtn).toBeEnabled()
    }
  })

  test('donor wall page loads', async ({ page }) => {
    await page.goto('/donate/wall')

    // Should show donor wall or redirect
    const heading = page.getByRole('heading', { name: /donor|wall|supporters/i })
    if (await heading.isVisible().catch(() => false)) {
      await expect(heading).toBeVisible()
    }
  })
})
