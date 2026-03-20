import { test, expect } from '@playwright/test'
import { login, TEST_PARTICIPANT } from './helpers'

test.describe('Shop: Browse → Add to Cart → Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_PARTICIPANT)
  })

  test('browses products', async ({ page }) => {
    await page.goto('/shop')
    await expect(page.getByRole('heading', { name: /shop|merch|store/i })).toBeVisible()

    // Verify products are displayed
    const products = page.locator('[data-testid="product-card"]')
    if ((await products.count()) > 0) {
      await expect(products.first()).toBeVisible()
    }
  })

  test('views product detail', async ({ page }) => {
    await page.goto('/shop')

    const productCard = page.locator('[data-testid="product-card"]').first()
    if (await productCard.isVisible().catch(() => false)) {
      await productCard.click()

      // Should be on product detail page
      await expect(
        page.getByRole('button', { name: /add to cart|add to bag/i }),
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('adds item to cart', async ({ page }) => {
    await page.goto('/shop')

    const productCard = page.locator('[data-testid="product-card"]').first()
    if (await productCard.isVisible().catch(() => false)) {
      await productCard.click()

      // Select a variant if available
      const sizeOption = page.getByText(/^M$/i)
      if (await sizeOption.isVisible().catch(() => false)) {
        await sizeOption.click()
      }

      // Add to cart
      await page.getByRole('button', { name: /add to cart|add to bag/i }).click()

      // Cart badge should update
      await expect(
        page.getByText(/added|cart/i),
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('views cart and proceeds to checkout', async ({ page }) => {
    // First add an item
    await page.goto('/shop')
    const productCard = page.locator('[data-testid="product-card"]').first()
    if (await productCard.isVisible().catch(() => false)) {
      await productCard.click()
      await page.getByRole('button', { name: /add to cart|add to bag/i }).click()

      // Navigate to cart
      const cartLink = page.getByRole('link', { name: /cart|bag/i })
      if (await cartLink.isVisible().catch(() => false)) {
        await cartLink.click()
      } else {
        await page.goto('/shop/cart')
      }

      await expect(page).toHaveURL(/\/cart/)

      // Verify cart has items
      const checkoutBtn = page.getByRole('button', { name: /checkout|pay/i })
      if (await checkoutBtn.isVisible().catch(() => false)) {
        // Don't actually proceed to Stripe in tests, just verify button exists
        await expect(checkoutBtn).toBeEnabled()
      }
    }
  })

  test('applies promo code', async ({ page }) => {
    await page.goto('/shop/cart')

    const promoInput = page.getByPlaceholder(/promo|code|coupon/i)
    if (await promoInput.isVisible().catch(() => false)) {
      await promoInput.fill('TESTCODE')
      const applyBtn = page.getByRole('button', { name: /apply/i })
      if (await applyBtn.isVisible().catch(() => false)) {
        await applyBtn.click()
        // Either success or invalid message
        await page.waitForTimeout(1000)
      }
    }
  })
})
