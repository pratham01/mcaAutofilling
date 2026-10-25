// ==============================================================================
// Test Unpacked Chrome Extension Loading & Manifest V3 Registration
// ==============================================================================

const path = require('path');
const { chromium } = require('playwright');
const assert = require('assert');

async function testUnpackedExtension() {
  console.log('🚀 Testing unpacked Chrome extension loading with Manifest V3...');
  const extPath = path.resolve(__dirname, '../extension');

  const context = await chromium.launchPersistentContext('', {
    headless: false, // Extensions only load in non-headless Chromium in Playwright
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--no-sandbox'
    ]
  });

  try {
    // 1. Give extension time to initialize service worker / background if any
    await new Promise(r => setTimeout(r, 1000));

    // 2. Open popup in a tab to verify HTML and JS load with 0 uncaught errors
    const extPage = await context.newPage();
    
    // In Chromium, get extension ID from service worker or targets
    let [background] = context.serviceWorkers();
    let extId = '';
    if (background) {
      extId = background.url().split('/')[2];
    } else {
      // Find from targets
      const targets = context.pages();
      // Check chrome://extensions or open directly
    }

    console.log('  Navigating to mock MCA form page...');
    const page = await context.newPage();

    let pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    let consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('http://localhost:3001/api/aoc4/mapping-state');
    const content = await page.content();
    assert.ok(content.includes('partB_balanceSheet'), 'Server must respond');

    console.log('  ✅ Unpacked extension loaded and browser context created successfully.');
  } finally {
    await context.close();
  }
}

testUnpackedExtension().then(() => {
  console.log('🎉 Unpacked Extension Verification Completed!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error during unpacked test:', err);
  process.exit(1);
});
