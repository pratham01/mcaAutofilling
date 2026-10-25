const { chromium } = require('playwright');

async function snapExtensions() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.goto('chrome://extensions');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scratch/chrome_ext_page.png' });
  await page.close();
  await browser.close();
  console.log('Saved screenshot to scratch/chrome_ext_page.png');
}

snapExtensions().catch(console.error);
