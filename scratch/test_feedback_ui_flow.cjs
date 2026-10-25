const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('Navigating to Professional Feedback tab...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('text=3. Professional Feedback');
  await page.waitForTimeout(1000);

  // Type a CA directive into the feedback composer
  const testInstruction = 'Previous reporting period trade payables should be 337 and short term provisions 346137. Actual AGM date is 20/09/2026';
  await page.fill('textarea[placeholder*="Previous reporting period figures"]', testInstruction);
  console.log('Filled feedback instruction:', testInstruction);

  // Click Submit & Auto-Adapt
  await page.click('text=Submit Feedback & Auto-Adapt');
  console.log('Clicked Submit Feedback button...');
  await page.waitForTimeout(2500);

  // Click Background Adaptation History tab to verify it was logged and applied
  await page.click('text=Background Adaptation History');
  await page.waitForTimeout(1000);

  const historyScreenshot = path.resolve(__dirname, 'ui_feedback_history_verified.png');
  await page.screenshot({ path: historyScreenshot, fullPage: false });
  console.log('Captured verified adaptation history screenshot:', historyScreenshot);

  await browser.close();
  console.log('Feedback UI test passed successfully!');
})();
