const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extPath = path.resolve('extension');
  console.log('Loading extension from:', extPath);

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--no-sandbox'
    ]
  });

  // Get extension ID from service worker or extension page
  let extensionId = null;
  
  // Wait a moment for extension to load
  await new Promise(r => setTimeout(r, 1000));

  // Check background service workers
  const workers = context.serviceWorkers();
  console.log('Service workers count:', workers.length);
  if (workers.length > 0) {
    const url = workers[0].url();
    extensionId = url.split('/')[2];
    console.log('Extension ID from service worker:', extensionId);
  }

  // If no service worker, open a page and check chrome-extension://
  const testPage = await context.newPage();
  
  testPage.on('console', msg => console.log(`[PAGE ${msg.type()}]:`, msg.text()));
  testPage.on('pageerror', err => console.log(`[PAGE ERROR]:`, err.message));

  // Find extension ID via chrome.management or targets
  if (!extensionId) {
    // Navigate to a blank page and inspect chrome.runtime
    await testPage.goto('https://www.mca.gov.in');
    console.log('Navigated to mca.gov.in');
    await testPage.waitForTimeout(2000);
  }

  await context.close();
  console.log('Done test');
})().catch(e => console.error('FATAL:', e));
