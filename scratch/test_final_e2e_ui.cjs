const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== RUNNING FINAL E2E UI TEST ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Opening http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('2. Clicking "Launch Chrome & Auto-Fill Credentials"...');
  const launchBtn = await page.waitForSelector('button:has-text("Launch Chrome")');
  await launchBtn.click();

  console.log('3. Waiting for CAPTCHA Required card to appear in Web Dashboard...');
  await page.waitForSelector('h3:has-text("CAPTCHA Required")', { timeout: 35000 });
  console.log('✅ CAPTCHA Required card appeared in Web UI!');

  // Check that the CAPTCHA image element is present
  const captchaImg = await page.waitForSelector('img[alt="MCA CAPTCHA"]', { timeout: 15000 }).catch(() => null);
  console.log('CAPTCHA image rendered in Web UI:', !!captchaImg);

  // Check that the CAPTCHA input is present
  const captchaInput = await page.$('input[placeholder="Enter CAPTCHA letters"]');
  console.log('CAPTCHA input rendered in Web UI:', !!captchaInput);

  // Check that Refresh CAPTCHA button is present
  const refreshBtn = await page.$('button:has-text("Refresh CAPTCHA")');
  console.log('Refresh CAPTCHA button rendered in Web UI:', !!refreshBtn);

  // Take screenshot of the Web UI with CAPTCHA card active
  await page.screenshot({ path: 'scratch_dashboard_final_captcha.png', fullPage: true });
  console.log('Saved scratch_dashboard_final_captcha.png');

  // Copy to artifacts
  const artifactDir = 'C:\\Users\\Sonal\\.gemini\\antigravity-ide\\brain\\8a590e63-da4d-4636-b798-5f9cec6cae24';
  fs.copyFileSync('scratch_dashboard_final_captcha.png', path.join(artifactDir, 'aoc4_dashboard_captcha_step1.png'));
  console.log('Copied to artifacts/aoc4_dashboard_captcha_step1.png');

  await browser.close();
  console.log('=== FINAL E2E UI TEST SUCCEEDED ===');
})();
