const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extPath = path.resolve('extension');
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      '--disable-extensions-except=' + extPath,
      '--load-extension=' + extPath
    ]
  });

  const page = await context.newPage();
  await page.goto('chrome://extensions-internals/');
  const content = await page.content();
  
  // Extract all extension entries
  const matches = [...content.matchAll(/"name":\s*"([^"]+)"[\s\S]*?"id":\s*"([^"]+)"/g)];
  for (const m of matches) {
    console.log('Ext:', m[1], '->', m[2]);
  }

  // Also check if our extension has any load error
  if (content.includes('error') || content.includes('Error')) {
    const errorMatches = content.match(/error[^,\n}]+/gi);
    console.log('Errors found:', errorMatches);
  }

  await context.close();
})();
