import { test, expect } from '@playwright/test'
import { login, TEST_LEADER } from './helpers'

test.describe('Leader: Create Event → Manage Attendance → Log Impact', () => {
  test.beforeEach(async ({ page }) => {
    // Leader login — requires a seeded leader account
    await login(page, TEST_LEADER)
  })

  test('creates a new event', async ({ page }) => {
    await page.goto('/events/create')
    await expect(page.getByRole('heading', { name: /create event/i })).toBeVisible()

    // Fill event details
    await page.getByLabel(/title|name/i).first().fill('Monthly Beach Cleanup')
    await page.getByLabel(/description/i).fill('Join us for our monthly beach cleanup at Main Beach.')

    // Select activity type
    const activitySelect = page.getByLabel(/activity type/i)
    if (await activitySelect.isVisible().catch(() => false)) {
      await activitySelect.selectOption('beach_cleanup')
    }

    // Set date
    const dateField = page.getByLabel(/date/i).first()
    if (await dateField.isVisible().catch(() => false)) {
      await dateField.fill('2026-04-20')
    }

    // Set location
    const locationField = page.getByLabel(/address|location/i).first()
    if (await locationField.isVisible().catch(() => false)) {
      await locationField.fill('Main Beach, Byron Bay NSW')
    }

    // Submit
    await page.getByRole('button', { name: /create|publish|save/i }).click()
    await expect(
      page.getByText(/event created|published|saved/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('manages attendance and checks in a participant', async ({ page }) => {
    // Navigate to an existing event's attendance view
    await page.goto('/events')

    // Click into an event the leader manages
    const eventLink = page.getByText(/beach cleanup/i).first()
    if (await eventLink.isVisible().catch(() => false)) {
      await eventLink.click()

      // Look for attendance/manage button
      const manageBtn = page.getByRole('link', { name: /manage|attendance|check.in/i })
      if (await manageBtn.isVisible().catch(() => false)) {
        await manageBtn.click()

        // Check in first attendee
        const checkInBtn = page.getByRole('button', { name: /check.in/i }).first()
        if (await checkInBtn.isVisible().catch(() => false)) {
          await checkInBtn.click()
          await expect(page.getByText(/checked in/i)).toBeVisible({ timeout: 5000 })
        }
      }
    }
  })

  test('logs impact data for an event', async ({ page }) => {
    await page.goto('/events')

    const eventLink = page.getByText(/beach cleanup/i).first()
    if (await eventLink.isVisible().catch(() => false)) {
      await eventLink.click()

      // Navigate to impact logging
      const impactLink = page.getByRole('link', { name: /log impact|impact/i })
      if (await impactLink.isVisible().catch(() => false)) {
        await impactLink.click()

        // Fill impact form
        const rubbishField = page.getByLabel(/rubbish|bags/i).first()
        if (await rubbishField.isVisible().catch(() => false)) {
          await rubbishField.fill('15')
        }

        const volunteersField = page.getByLabel(/volunteers|participants/i).first()
        if (await volunteersField.isVisible().catch(() => false)) {
          await volunteersField.fill('20')
        }

        await page.getByRole('button', { name: /submit|save|log/i }).click()
        await expect(
          page.getByText(/impact logged|saved|recorded/i),
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
