const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('=== LAUNCHING CHROME WITH EXTENSION FOR MANUAL LOGIN ===');
  const extensionPath = path.resolve(__dirname, 'extension');
  const userDataDir = path.resolve(__dirname, 'scratch', 'playwright_user_data');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--start-maximized',
      '--window-size=1400,900'
    ],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  
  console.log('1. Navigating to MCA V3 Login / AOC-4 landing page...');
  const targetUrl = 'https://www.mca.gov.in/content/mca/global/en/mca/e-filing/annual-filings/form-aoc4.html';
  
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`Current URL: ${page.url()}`);
  } catch (err) {
    console.error(`Navigation error: ${err.message}`);
  }

  console.log('\n=============================================================');
  console.log('  BROWSER IS OPEN. EXTENSION IS LOADED.');
  console.log('  1. Please login to MCA.');
  console.log('  2. Open the AOC-4 form.');
  console.log('  3. Click the extension icon and try to Autofill & Save.');
  console.log('  DO NOT CLOSE THIS TERMINAL WHILE TESTING.');
  console.log('=============================================================');

  // Keep alive
  await new Promise(() => {});
})();
