const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const captchaBox = await page.$('h3:has-text("CAPTCHA Required")');
  console.log('Is CAPTCHA Box visible initially:', !!captchaBox);

  // Take screenshot of the Step 1 initial state
  await page.screenshot({ path: 'scratch_step1_ready.png', fullPage: true });
  console.log('Saved scratch_step1_ready.png');

  await browser.close();
})();
