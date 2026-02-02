import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const timestamp = Date.now();
  const userEmail = `testuser${timestamp}@example.com`;
  const userPass = 'Password123!';
  const userPhone = '11999999999';

  test('should allow a user to register, login and logout', async ({ page }) => {
    // 1. Register
    await page.goto('/cadastro');
    await expect(page).toHaveURL(/\/cadastro/);

    // Fill registration form
    // Using ID selectors which are present in the RegisterPage.tsx
    await page.locator('input[id="name"]').fill('Test User');
    await page.locator('input[id="email"]').fill(userEmail);
    await page.locator('input[id="phone"]').fill(userPhone);
    await page.locator('input[id="password"]').fill(userPass);
    
    // NOTE: RegisterPage does NOT have confirmPassword field, removed.

    // Submit registration
    await page.getByRole('button', { name: /cadastrar|registrar|criar conta/i }).click();

    // 2. Expect redirection to Login or Dashboard
    // RegisterPage shows a success message and then redirects after 1.5s
    // Or allows user to click "Ir para Login"
    // Let's wait for redirection to Login
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    
    // Perform Login
    console.log('Redirected to login page, performing login...');
    await page.locator('input[id="email"]').fill(userEmail);
    await page.locator('input[id="password"]').fill(userPass);
    
    // "Entrar" is the specific button text in LoginPage
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    
    // 3. Verify Login success (Dashboard)
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
    
    // Check for some dashboard element
    await expect(page.getByText(/bem-vindo/i).or(page.locator('h1'))).toBeVisible();

    // 4. Logout
    const logoutBtn = page.getByRole('button', { name: /sair|logout/i }).or(page.locator('button[aria-label="Logout"]'));
    
    if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
    } else {
        const menuBtn = page.locator('button').filter({ hasText: /perfil|conta|menu/i }).first();
        if (await menuBtn.isVisible()) {
            await menuBtn.click();
            await page.getByText(/sair|logout/i).click();
        }
    }

    // Verify redirection to login or home
    await expect(page).toHaveURL(/\/login|^\/$/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[id="email"]').fill('wronguser@example.com');
    await page.locator('input[id="password"]').fill('InvalidPass123!');

    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    // Wait for error message
    const errorToast = page.getByRole('alert').first();
    await expect(errorToast).toBeVisible({ timeout: 10000 });
  });
});
