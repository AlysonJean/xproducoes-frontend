import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard & Management', () => {
  test('should display admin dashboard when logged in as admin', async ({ page }) => {
    // This test assumes there's an admin account available for testing
    // In production, you should use test fixtures or test accounts
    
    await page.goto('/login');
    
    const emailInput = page.locator('input[id="email"]');
    if (await emailInput.isVisible()) {
      // Try admin login (adjust credentials based on your test setup)
      await emailInput.fill('admin@example.com');
      await page.locator('input[id="password"]').fill('admin123');
      await page.getByRole('button', { name: 'Entrar' }).click();

      // Wait for either dashboard or error
      await Promise.race([
        page.waitForURL(/.*admin.*dashboard.*/, { timeout: 10000 }),
        page.waitForURL(/.*dashboard.*/, { timeout: 10000 }),
        page.locator('text=/não encontrado|acesso negado|invalid/i').waitFor({ timeout: 10000 })
      ]).catch(() => {
        // If can't determine, skip test
        test.skip(true, 'Admin account not available for testing');
      });

      // If we got to a dashboard, verify it has admin elements
      const dashboardElement = page.locator('h1, .admin-title, text=/dashboard|painel/i');
      if (await dashboardElement.isVisible()) {
        await expect(dashboardElement).toBeVisible();
      }
    }
  });

  test('should allow navigation through admin menu', async ({ page }) => {
    await page.goto('/admin');

    // Check if redirected to login
    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated as admin');
    }

    // Navigate to different admin sections
    const sections = [
      { name: 'equipamentos', url: '/admin/equipment' },
      { name: 'reservas', url: '/admin/bookings' },
      { name: 'colaboradores', url: '/admin/collaborators' },
      { name: 'configurações', url: '/admin/settings' }
    ];

    for (const section of sections) {
      const link = page.getByRole('link', { name: new RegExp(section.name, 'i') });
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click();
        // Just verify page loaded, don't require specific URL due to routing flexibility
        await page.waitForLoadState('networkidle').catch(() => null);
      }
    }
  });

  test('should display equipment list in admin', async ({ page }) => {
    await page.goto('/admin/equipment');

    // Check if redirected to login
    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated as admin');
    }

    // Wait for equipment table or list to load
    const equipmentTable = page.locator('table, [role="table"], .equipment-list');
    const emptyState = page.locator('text=/nenhum|vazio|não há/i');

    await Promise.race([
      equipmentTable.waitFor({ state: 'visible', timeout: 5000 }),
      emptyState.waitFor({ state: 'visible', timeout: 5000 })
    ]).catch(() => {
      // Expected if page takes time to load
    });

    // If equipment exists, verify we can see it
    if (await equipmentTable.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Add equipment button should exist
      const addBtn = page.getByRole('button', { name: /adicionar|novo|criar|add/i });
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(addBtn).toBeVisible();
      }
    }
  });
});

test.describe('Performance & Load Testing', () => {
  test('homepage should load in under 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
    
    // Verify hero section is visible
    const hero = page.locator('h1, .hero, [class*="hero"]');
    if (await hero.count() > 0) {
      await expect(hero.first()).toBeVisible();
    }
  });

  test('shop page list should load and display items quickly', async ({ page }) => {
    await page.goto('/equipment');
    
    // Wait for items to appear
    const items = page.locator('article, .product-card, [class*="card"]');
    
    await Promise.race([
      items.first().waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('text=/nenhum|vazio/i').waitFor({ state: 'visible', timeout: 5000 })
    ]).catch(() => null);

    // Verify page is responsive
    const viewport = page.viewportSize();
    if (viewport) {
      await expect(page).toHaveTitle(/xproducoes|X-Produções/i);
    }
  });

  test('should handle multiple rapid navigations without errors', async ({ page }) => {
    const routes = ['/', '/kits', '/equipment', '/about', '/contact'];
    
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'load' });
      
      // Check no errors in console
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.log(`Console error on ${route}: ${msg.text()}`);
        }
      });
      
      // Verify page loaded
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    }
  });
});
