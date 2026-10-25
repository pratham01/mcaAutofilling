const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Screenshot 1: Tab 1 (AOC-4 Filing Dashboard with Continuous Observability & Embedded Feedback Console)
  const ss1 = path.resolve(__dirname, 'ui_aoc4_dashboard_with_stream.png');
  await page.screenshot({ path: ss1, fullPage: false });
  console.log('Saved AOC4 dashboard screenshot:', ss1);

  // Click Tab 2: Template & Mapping Studio
  const tplTab = page.locator('text=2. Template & Mapping Studio');
  if (await tplTab.count() > 0) {
    await tplTab.click();
    await page.waitForTimeout(1500);
    const ss2 = path.resolve(__dirname, 'ui_template_studio_all_fields.png');
    await page.screenshot({ path: ss2, fullPage: false });
    console.log('Saved Template Studio screenshot:', ss2);
  }

  // Click Tab 3: Professional Feedback & Auto-Adaptation
  const fbTab = page.locator('text=3. Professional Feedback');
  if (await fbTab.count() > 0) {
    await fbTab.click();
    await page.waitForTimeout(1500);
    const ss3 = path.resolve(__dirname, 'ui_professional_feedback_screen.png');
    await page.screenshot({ path: ss3, fullPage: false });
    console.log('Saved Feedback Screen screenshot:', ss3);
  }

  await browser.close();
  console.log('All UI test captures completed successfully!');
})();
