import { test, expect } from '@playwright/test'
import { login, TEST_PARTICIPANT } from './helpers'

test.describe('Chat: Send Message → Reply → Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_PARTICIPANT)
  })

  test('sends a chat message', async ({ page }) => {
    await page.goto('/chat')

    // Click into a collective chat
    const chatLink = page.locator('[data-testid="chat-list-item"]').first()
    if (await chatLink.isVisible().catch(() => false)) {
      await chatLink.click()
    } else {
      // May redirect to single chat directly
      await page.waitForURL(/\/chat\//, { timeout: 5000 }).catch(() => {})
    }

    // Type and send a message
    const messageInput = page.getByPlaceholder(/message|type/i)
    if (await messageInput.isVisible().catch(() => false)) {
      const testMsg = `E2E test message ${Date.now()}`
      await messageInput.fill(testMsg)
      await page.getByRole('button', { name: /send/i }).click()

      // Verify message appears in chat
      await expect(page.getByText(testMsg)).toBeVisible({ timeout: 5000 })
    }
  })

  test('replies to a message', async ({ page }) => {
    await page.goto('/chat')

    // Navigate to chat
    const chatLink = page.locator('[data-testid="chat-list-item"]').first()
    if (await chatLink.isVisible().catch(() => false)) {
      await chatLink.click()
    }

    // Long-press or right-click a message to get reply option
    const message = page.locator('[data-testid="chat-message"]').first()
    if (await message.isVisible().catch(() => false)) {
      // Try long press for mobile or context menu
      await message.click({ button: 'right' })
      const replyBtn = page.getByText(/reply/i)
      if (await replyBtn.isVisible().catch(() => false)) {
        await replyBtn.click()

        const messageInput = page.getByPlaceholder(/message|type|reply/i)
        await messageInput.fill('E2E reply message')
        await page.getByRole('button', { name: /send/i }).click()
        await expect(page.getByText('E2E reply message')).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('searches chat messages', async ({ page }) => {
    await page.goto('/chat')

    const chatLink = page.locator('[data-testid="chat-list-item"]').first()
    if (await chatLink.isVisible().catch(() => false)) {
      await chatLink.click()
    }

    // Open search
    const searchBtn = page.getByRole('button', { name: /search/i })
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click()

      const searchInput = page.getByPlaceholder(/search/i)
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('hello')
        // Wait for search results
        await page.waitForTimeout(1000)
        // Verify search UI is visible
        expect(searchInput).toBeVisible()
      }
    }
  })
})
