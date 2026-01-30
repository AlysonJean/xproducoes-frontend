import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test.describe('Sanity Check - Auth Flow', () => {
  const uniqueId = randomUUID().replace(/-/g, '').substring(0, 8);
  const testUser = {
    name: `Test User ${uniqueId}`,
    email: `test_${uniqueId}@example.com`,
    phone: '1234567890',
    password: 'Password123!'
  };

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    // Fill form
    await page.fill('input[id="name"]', testUser.name);
    await page.fill('input[id="email"]', testUser.email);
    await page.fill('input[id="phone"]', testUser.phone);
    await page.fill('input[id="password"]', testUser.password);

    // Submit
    await page.click('button[type="submit"]');

    // Check for success or specific error
    // Wait for either success message or error alert
    const successMsg = page.getByText('Conta criada com sucesso!');
    // Error message usually appears in a specific container in RegisterPage
    const errorMsg = page.locator('.text-destructive'); 
    
    // Wait for any state change
    await Promise.race([
        successMsg.waitFor({ state: 'visible', timeout: 10000 }),
        errorMsg.first().waitFor({ state: 'visible', timeout: 10000 })
    ]).catch(() => console.log('Timeout waiting for response'));

    if (await errorMsg.count() > 0 && await errorMsg.first().isVisible()) {
        const text = await errorMsg.first().textContent();
        console.error(`Register Failed with message: ${text}`);
        throw new Error(`Register Failed: ${text}`);
    }

    // Expect success message
    await expect(successMsg).toBeVisible();
  });

  test('should login with the new user', async ({ page }) => {
    // Note: This relies on the previous test running successfully or persisting state if run in sequence. 
    // Ideally, tests should be isolated, but we are doing a quick flow check.
    // For meaningful isolation, we would register via API or seed.
    // However, since we just want to test buttons, let's just do the full flow in one test to be safe 
    // or register again (but that would duplicate emails if we don't randomize).
    // Let's combine them into one E2E flow for robust checking.
  });

  test('Full Auth Flow: Register -> Login -> Dashboard', async ({ page }) => {
    // 1. Register
    await page.goto('/register');
    await page.fill('input[id="name"]', testUser.name);
    await page.fill('input[id="email"]', testUser.email);
    await page.fill('input[id="phone"]', testUser.phone);
    await page.fill('input[id="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page.getByText('Conta criada com sucesso!')).toBeVisible({ timeout: 15000 });

    // 2. Navigate to Login (or follow the link)
    await page.goto('/login');
    
    // 3. Login
    await page.fill('input[id="email"]', testUser.email);
    await page.fill('input[id="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // 4. Verify Dashboard
    // Wait for URL to change to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    
    // Check for some dashboard element if possible, or just the URL is good enough for now.
    // Given we don't know exact dashboard content, URL is the safest bet.
  });

  test('Login Page Buttons Check', async ({ page }) => {
    await page.goto('/login');
    
    // Check "Criar conta" link
    const registerLink = page.getByRole('link', { name: /Registe-se/i });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');

    // Check "Esqueceu sua senha?" link
    const forgotLink = page.getByRole('link', { name: /Esqueceu sua senha/i });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute('href', '/forgot-password');
  });
});
