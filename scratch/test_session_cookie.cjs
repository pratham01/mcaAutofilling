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

  console.log('1. Priming Akamai cookies with home.html...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/home.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  console.log('2. Checking if home page sees user session...');
  const homeCheck = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const hasSonal = text.includes('SONAL') || text.includes('Hello');
    const hasSignout = !!document.querySelector('#signout, #logout, a[href*="logout" i]');
    return { hasSonal, hasSignout };
  });
  console.log('Home check result:', homeCheck);

  console.log('3. Navigating to application history...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/application-history.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);

  const appCheck = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const hasSonal = text.includes('SONAL') || text.includes('Hello');
    const hasSignout = !!document.querySelector('#signout, #logout, a[href*="logout" i]');
    const isLoginPage = window.location.href.includes('fologin.html');
    return { hasSonal, hasSignout, isLoginPage };
  });
  console.log('Application history check result:', appCheck);

  await browser.close();
})();
