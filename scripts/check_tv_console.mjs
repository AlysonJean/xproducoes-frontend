import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[console ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error('[pageerror]', err);
  });

  // Helper: wait for a console message that matches a regex
  const waitForConsoleRegex = (regex, timeout = 6000) => new Promise((resolve, reject) => {
    const listener = msg => {
      try {
        const text = msg.text();
        if (regex.test(text)) {
          page.off('console', listener);
          resolve(text);
        }
      } catch (e) {
        // ignore
      }
    };
    page.on('console', listener);
    const timer = setTimeout(() => {
      page.off('console', listener);
      reject(new Error('timeout'));
    }, timeout);
  });

  try {
    for (const path of ['/', '/tv?slug=teste', '/tv', '/admin/social', '/admin/social/list']) {
      console.log('\nVisiting ' + path + ' on port 3000');

      // Ensure debug flag is set early so the app will emit lightweight Sponsor loaded logs
      await page.addInitScript(() => {
        try {
          // @ts-ignore
          window.__TV_DEBUG = true;
          // @ts-ignore
          window.__sponsorsLoaded = 0;
        } catch (e) { /* ignore */ }
      });

      await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle' });
      // Wait a bit to let any async errors appear
      await page.waitForTimeout(3000);

      // Capture DOM info: images and presence of QR (svg)
      const imgs = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(i => ({ src: i.src, alt: i.alt, visible: !!(i.offsetParent || i.getClientRects().length) })));
      const hasSvg = await page.evaluate(() => !!document.querySelector('svg'));
      const bodyText = await page.evaluate(() => (document.body && document.body.innerText) ? document.body.innerText.slice(0, 2000) : '');
      const rootHtml = await page.evaluate(() => (document.getElementById('root') && document.getElementById('root').innerHTML) ? document.getElementById('root').innerHTML.slice(0, 2000) : '');
      console.log('Page captures:', { imgsCount: imgs.length, hasSvg, imgsSample: imgs.slice(0,6), bodyTextSnippet: bodyText, rootHtmlSnippet: rootHtml });

      // Save screenshot for manual inspection (file per path)
      const name = path.replace(/[^a-z0-9]/gi, '_') || 'root';
      await page.screenshot({ path: `./tmp_screenshots/${name}.png`, fullPage: true });

      // Try to wait for the app debug log that indicates sponsor imgs rendered
      try {
        try {
          // Prefer per-image onLoad logs emitted when debug flag is set
          const log = await waitForConsoleRegex(/Sponsor loaded:/i, 6000);
          console.log('Detected sponsor onLoad log:', log);
        } catch (err) {
          console.debug('Sponsor onLoad log not detected within timeout, falling back to SlideComponent DOM log and polling');
          try {
            const log2 = await waitForConsoleRegex(/SlideComponent - DOM sponsor imgs count:\s*\d+/i, 2000);
            console.log('Detected slide component sponsor count log:', log2);
          } catch (err2) {
            // Poll briefly for sponsor images injected after initial render (debug)
            const max = 4000; // ms
            const interval = 250; // ms
            let elapsed = 0;
             
            console.debug('Sponsor check (fallback): not found initially, waiting up to', max, 'ms');
            let found2 = await page.evaluate(() => !!document.querySelector('.sponsor-debug-img'));
            while (!found2 && elapsed < max) {
              await page.waitForTimeout(interval);
              elapsed += interval;
              found2 = await page.evaluate(() => !!document.querySelector('.sponsor-debug-img'));
            }
             
            console.debug('Sponsor check (fallback): finished waiting, elapsed', elapsed, 'ms');
          }
        }

        const imgsLater = await page.evaluate(() => Array.from(document.querySelectorAll('.sponsor-debug-img')).map(i => ({ src: i.src, alt: i.alt })));
         
        console.log('Sponsor-debug imgs at final check:', imgsLater.length, imgsLater.slice(0,6));
        if (imgsLater.length > 0) {
          await page.screenshot({ path: `./tmp_screenshots/${name}_sponsors.png`, fullPage: true });
        } else {
           
          console.debug('Sponsor check: no sponsor images found after wait');
        }
      } catch (e) {
        console.warn('Sponsor check failed', e);
      }
    }
  } catch (e) {
    console.error('Navigation error', e);
  } finally {
    await browser.close();
  }
})();