const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const sessionPath = path.resolve('data/mca_session_state.json');
  console.log('Loading session from:', sessionPath);

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized',
    ]
  });

  const context = await browser.newContext({
    storageState: sessionPath,
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  await page.route('**/clientlib-devtool.js*', route => route.abort());

  console.log('1. Going to home.html...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/home.html', { waitUntil: 'load', timeout: 30000 });
  
  console.log('Waiting 6s for session check API...');
  await page.waitForTimeout(6000);

  const homeCheck = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const sonal = text.includes('SONAL') || text.includes('Sonal') || text.includes('Hello');
    const myApp = Array.from(document.querySelectorAll('a')).some(a => (a.innerText || '').includes('My Application'));
    return { sonal, myApp, url: window.location.href };
  });
  console.log('Home check result:', homeCheck);

  await browser.close();
})();
