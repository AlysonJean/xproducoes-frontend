import { test, expect } from '@playwright/test';

// Teste E2E simples para frontend/public/debug.html
test.describe('debug.html safe rendering', () => {
  test('não deve executar HTML injetado via localStorage', async ({ page }) => {
    // Definir uma chave maliciosa no localStorage antes de navegar
    await page.addInitScript(() => {
      localStorage.setItem('malicious', '<img src=x onerror="window.__XSS_TRIGGERED = true">');
    });

    await page.goto('http://localhost:5173/debug.html');

    // esperar que o script da página tenha inicializado
    await page.waitForTimeout(200);

    // Checar se a variável global que indicaria execução não existe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const triggered = await page.evaluate(() => (window as any).__XSS_TRIGGERED === true);
    expect(triggered).toBeFalsy();

    // Além disso garantir que nenhum elemento <script> foi inserido dinamicamente dentro do resultado
    const scriptCount = await page.locator('#result script').count();
    expect(scriptCount).toBe(0);
  });
});
