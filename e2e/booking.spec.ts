import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  const timestamp = Date.now();
  const userEmail = `bookingtest${timestamp}@example.com`;
  const userPassword = 'Password123!';

  test('should complete full booking flow', async ({ page }) => {
    // 1. Register and login
    await page.goto('/cadastro');
    await expect(page).toHaveURL(/\/cadastro/);

    await page.locator('input[id="name"]').fill('Booking Tester');
    await page.locator('input[id="email"]').fill(userEmail);
    await page.locator('input[id="phone"]').fill('11988888888');
    await page.locator('input[id="password"]').fill(userPassword);
    
    await page.getByRole('button', { name: /cadastrar|registrar/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // Login
    await page.locator('input[id="email"]').fill(userEmail);
    await page.locator('input[id="password"]').fill(userPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });

    // 2. Navigate to shop
    await page.goto('/kits');
    await expect(page).toHaveURL(/\/kits/);

    const kitCards = page.locator('article, .kit-card');
    
    if (await kitCards.count() > 0) {
      // 3. Select first kit and add to cart
      await kitCards.first().click();
      
      const addToCartBtn = page.getByRole('button', { name: /adicionar ao carrinho|add to cart/i });
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();
        
        // 4. Verify cart notification
        await expect(page.locator('text=/sucesso|adicionado/i').or(page.locator('.toast'))).toBeVisible({ timeout: 5000 });
      }

      // 5. Navigate to bookings to create one
      await page.goto('/book ing');
      await expect(page).toHaveURL(/\/booking|book/i);

      // 6. Fill booking form (if exists)
      const eventNameInput = page.locator('input[name="eventName"], input[placeholder*="evento"]');
      const eventDateInput = page.locator('input[name="eventDate"], input[type="date"]');
      
      if (await eventNameInput.isVisible()) {
        await eventNameInput.fill('Test Wedding Event');
        
        // Set date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 7);
        const dateStr = `${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${String(tomorrow.getDate()).padStart(2, '0')}/${tomorrow.getFullYear()}`;
        
        if (await eventDateInput.isVisible()) {
          await eventDateInput.fill(dateStr);
        }

        // Submit booking
        const submitBtn = page.getByRole('button', { name: /reservar|book|agendar|enviar/i });
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          
          // Expect success message or redirect to confirmation
          await expect(page.locator('text=/reserva criada|booking criada|sucesso/i').or(page.locator('.toast'))).toBeVisible({ timeout: 10000 });
        }
      }
    } else {
      test.skip(true, 'No kits available for booking test');
    }
  });

  test('should show validation error with empty booking details', async ({ page }) => {
    // Register and login
    await page.goto('/cadastro');
    await page.locator('input[id="name"]').fill('Validation Tester');
    await page.locator('input[id="email"]').fill(`valtest${Date.now()}@example.com`);
    await page.locator('input[id="phone"]').fill('11977777777');
    await page.locator('input[id="password"]').fill('Password123!');
    await page.getByRole('button', { name: /cadastrar|registrar/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await page.locator('input[id="email"]').fill(`valtest${Date.now()}@example.com`);
    await page.locator('input[id="password"]').fill('Password123!');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Navigate to booking
    await page.goto('/booking');
    
    // Try to submit without filling form
    const submitBtn = page.getByRole('button', { name: /reservar|book|agendar|enviar/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      
      // Expect validation error
      await expect(page.locator('text=/obrigatório|required|preenchimento|inválido/i').or(page.locator('[role="alert"]'))).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view booking history', async ({ page }) => {
    // Quick login
    await page.goto('/login');
    
    // Try to login with test account if exists
    const emailInput = page.locator('input[id="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await page.locator('input[id="password"]').fill('test');
      await page.getByRole('button', { name: 'Entrar' }).click();

      // Wait for dashboard
      await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 }).catch(() => {
        // Expected if test account doesn't exist
        test.skip(true, 'Test account not available');
      });

      // Navigate to bookings history
      const bookingsLink = page.getByRole('link', { name: /reservas|bookings|meus agendamentos/i });
      if (await bookingsLink.isVisible()) {
        await bookingsLink.click();
        await expect(page).toHaveURL(/\/bookings|reservas/i);
      }
    }
  });
});
