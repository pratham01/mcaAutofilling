const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extPath = path.resolve('extension').replace(/\\/g, '/');
  console.log('Normalized extension path:', extPath);

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`
    ]
  });

  const page = await context.newPage();
  await page.goto('chrome://system');
  const extensionsText = await page.evaluate(async () => {
    // Check if chrome.management is accessible or list extensions
    return document.body.innerText;
  }).catch(e => e.message);

  console.log('System page loaded, length:', extensionsText.length);

  // Let's test by opening a page that matches content script: https://www.mca.gov.in
  const mcaPage = await context.newPage();
  let contentScriptInjected = false;
  mcaPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AOC-4 Extension]')) {
      console.log('CONTENT SCRIPT DETECTED:', text);
      contentScriptInjected = true;
    }
  });

  await mcaPage.goto('https://www.mca.gov.in/content/mca/global/en/fop/form-aoc4.html').catch(() => {});
  await mcaPage.waitForTimeout(3000);

  console.log('Content script injected?:', contentScriptInjected);
  await context.close();
})();
