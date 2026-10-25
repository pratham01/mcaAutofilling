const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const res = await page.evaluate(() => {
    try {
      document.querySelector('#autoSearchIcon, button:has-text("Search"), [id*="autoSearchIcon"]');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.name + ': ' + e.message };
    }
  });

  console.log('Result of querySelector with :has-text in Chrome:', res);
  await browser.close();
})();
