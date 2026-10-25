const { chromium } = require('playwright');

(async () => {
  console.log('Testing Launch button click in UI...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click the Launch button
  const launchBtn = await page.waitForSelector('button:has-text("Launch Chrome")');
  console.log('Found launch button. Clicking...');
  await launchBtn.click();

  // Wait for the CAPTCHA prompt box to appear
  console.log('Waiting for CAPTCHA prompt box...');
  await page.waitForSelector('h3:has-text("CAPTCHA Required")', { timeout: 25000 });
  console.log('✅ SUCCESS: CAPTCHA card appeared!');

  // Check if CAPTCHA input is present
  const captchaInput = await page.$('input[placeholder="Enter CAPTCHA letters"]');
  console.log('CAPTCHA input present:', !!captchaInput);

  // Check if Refresh button is present
  const refreshBtn = await page.$('button:has-text("Refresh CAPTCHA")');
  console.log('Refresh CAPTCHA button present:', !!refreshBtn);

  // Check if "I Logged In in Chrome" button is present
  const loggedInBtn = await page.$('button:has-text("I Logged In in Chrome")');
  console.log('Manual verify button present:', !!loggedInBtn);

  // Take screenshot of the UI with CAPTCHA box
  await page.screenshot({ path: 'scratch_captcha_card_displayed.png', fullPage: true });
  console.log('Saved scratch_captcha_card_displayed.png');

  await browser.close();
})();
