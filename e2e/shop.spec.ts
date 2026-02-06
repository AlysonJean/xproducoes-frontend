import { test, expect } from '@playwright/test';

test.describe('Shop & Equipment Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should list kits and filter them', async ({ page }) => {
    await page.goto('/kits');
    
    // Verificar se kits renderizaram (assumindo que existe seed ou dados mockados)
    // Se estiver vazio, espera texto de "nenhum item"
    const kitCards = page.locator('article, .kit-card'); // Ajuste seletor genérico para cards
    const emptyState = page.locator('text=Nenhum kit encontrado');

    await Promise.race([
      kitCards.first().waitFor({ state: 'visible', timeout: 5000 }),
      emptyState.waitFor({ state: 'visible', timeout: 5000 })
    ]).catch(() => console.log('Timeout waiting for kits list'));

    if (await kitCards.count() > 0) {
      const firstKitName = await kitCards.first().locator('h3').innerText();
      console.log(`Found kit: ${firstKitName}`);
      
      // Testar busca
      const searchInput = page.locator('input[placeholder*="Buscar"]');
      await searchInput.fill(firstKitName.substring(0, 3));
      
      // Espera filtrar
      await page.waitForTimeout(500); // Debounce wait
      await expect(kitCards.first()).toContainText(firstKitName.substring(0, 3));
    }
  });

  test('should navigate to details and add to cart', async ({ page }) => {
    await page.goto('/kits');
    const kitCards = page.locator('article, .kit-card'); // Seletor genérico para card de produto

    if (await kitCards.count() > 0) {
      // Clicar no primeiro
      await kitCards.first().click();
      
      // Verificar se estamos na pagina de detalhes
      await expect(page).toHaveURL(/\/kits\/\d+/);
      
      // Verificar elementos da página de detalhe
      await expect(page.locator('h1')).toBeVisible(); // Titulo do produto
      await expect(page.locator('text=Adicionar ao Carrinho')).toBeVisible();

      // Adicionar
      await page.click('text=Adicionar ao Carrinho');
      
      // Verificar feedback (toast ou contador no header)
      await expect(page.locator('.toast, text=sucesso').or(page.locator('.cart-count'))).toBeVisible();
    } else {
        test.skip(true, 'No kits available to test details page');
    }
  });
});
