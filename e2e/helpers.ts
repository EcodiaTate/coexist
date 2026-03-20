import { type Page, expect } from '@playwright/test'

/**
 * Test account credentials.
 * In a real setup, these would be seeded into the test Supabase instance.
 */
export const TEST_PARTICIPANT = {
  email: 'participant@test.coexist.dev',
  password: 'TestPass123!',
  name: 'Test Participant',
}

export const TEST_LEADER = {
  email: 'leader@test.coexist.dev',
  password: 'LeaderPass123!',
  name: 'Test Leader',
}

/**
 * Sign up a new account via the signup form.
 */
export async function signUp(
  page: Page,
  { email, password, name }: { email: string; password: string; name: string },
) {
  await page.goto('/signup')
  await expect(page.getByRole('heading', { name: /sign up|create account/i })).toBeVisible()
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).first().fill(password)
  if (await page.getByLabel(/display name|full name|name/i).isVisible()) {
    await page.getByLabel(/display name|full name|name/i).fill(name)
  }
  // Accept terms if checkbox exists
  const termsCheckbox = page.getByLabel(/terms|agree/i)
  if (await termsCheckbox.isVisible().catch(() => false)) {
    await termsCheckbox.check()
  }
  await page.getByRole('button', { name: /sign up|create account/i }).click()
}

/**
 * Log in to an existing account.
 */
export async function login(
  page: Page,
  { email, password }: { email: string; password: string },
) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
}

/**
 * Complete onboarding steps (name, interests, location).
 */
export async function completeOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding/)

  // Step 1: Name (may already be filled from signup)
  const nameField = page.getByLabel(/name/i).first()
  if (await nameField.isVisible().catch(() => false)) {
    const currentValue = await nameField.inputValue()
    if (!currentValue) {
      await nameField.fill('Test User')
    }
    await page.getByRole('button', { name: /next|continue/i }).click()
  }

  // Step 2: Interests
  const interestOption = page.getByText(/tree planting/i)
  if (await interestOption.isVisible().catch(() => false)) {
    await interestOption.click()
    await page.getByRole('button', { name: /next|continue/i }).click()
  }

  // Step 3: Location
  const locationField = page.getByLabel(/location|state/i).first()
  if (await locationField.isVisible().catch(() => false)) {
    await locationField.fill('Byron Bay')
    await page.getByRole('button', { name: /next|continue|finish|done/i }).click()
  }
}
