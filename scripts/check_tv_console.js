const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[console ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error('[pageerror]', err);
  });

  try {
    await page.goto('http://localhost:5000/tv', { waitUntil: 'networkidle' });
    // Wait a bit to let any async errors appear
    await page.waitForTimeout(5000);
  } catch (e) {
    console.error('Navigation error', e);
  } finally {
    await browser.close();
  }
})();