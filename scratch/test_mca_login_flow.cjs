const { chromium } = require('playwright');

(async () => {
  console.log('--- TESTING REAL MCA LOGIN POPUP TRIGGER ---');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const context = await browser.newContext();
  await context.addInitScript(() => {
    try { delete Object.getPrototypeOf(navigator).webdriver; } catch (_) {}
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  await page.route('**/clientlib-devtool.js*', route => route.abort());

  console.log('1. Going to home.html...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/home.html', { waitUntil: 'commit' });
  await page.waitForTimeout(1500);

  console.log('2. Going to fologin.html...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html', { waitUntil: 'commit' });
  await page.waitForTimeout(3000);

  // Enter User ID
  const userInput = await page.waitForSelector('input[id*="guidetextbox___widget"], #userId, input[name="userID"]', { timeout: 10000 });
  console.log('Found User ID input. Typing with pressSequentially...');
  await userInput.click();
  await userInput.fill('');
  await userInput.type('pratham.bpl.pb@gmail.com', { delay: 30 });
  await userInput.press('Tab');
  await page.waitForTimeout(500);

  // Enter Password
  const passInput = await page.waitForSelector('input[id*="guidepasswordbox___widget"], #password, input[name="password"]', { timeout: 10000 });
  console.log('Found Password input. Typing with type()...');
  await passInput.click();
  await passInput.fill('');
  await passInput.type('Bajaj@1234', { delay: 30 });
  await passInput.press('Tab');
  await page.waitForTimeout(1000);

  // Click Login button
  console.log('Clicking Login button to open CAPTCHA modal...');
  const loginBtn = await page.waitForSelector('button:has-text("Login"), #login-submit, button[type="submit"]');
  await loginBtn.click();

  // Wait for CAPTCHA modal
  console.log('Waiting for #customCaptchaInput or .captchaPopup...');
  await page.waitForSelector('#customCaptchaInput', { timeout: 15000 });
  console.log('✅ CAPTCHA MODAL OPENED!');

  await page.waitForTimeout(2000);

  // Take screenshot of opened CAPTCHA modal
  await page.screenshot({ path: 'scratch_real_captcha_modal.png' });
  console.log('Saved scratch_real_captcha_modal.png');

  // Check canvas / img
  const captchaData = await page.evaluate(() => {
    const c = document.querySelector('#captchaCanvas');
    const img = document.querySelector('#captcha-img');
    return {
      canvasExists: !!c,
      canvasWidth: c ? c.width : 0,
      canvasHeight: c ? c.height : 0,
      imgExists: !!img,
      imgSrc: img ? img.src : '',
      imgVisible: img ? img.offsetParent !== null : false,
    };
  });
  console.log('Captcha element details in modal:', captchaData);

  // Screenshot the canvas
  const canvasEl = await page.$('#captchaCanvas');
  if (canvasEl) {
    await canvasEl.screenshot({ path: 'scratch_canvas_extracted.png' });
    console.log('Saved scratch_canvas_extracted.png');
  }

  // Screenshot the modal
  const modalEl = await page.$('.modal-content, .captchaPopup');
  if (modalEl) {
    await modalEl.screenshot({ path: 'scratch_modal_extracted.png' });
    console.log('Saved scratch_modal_extracted.png');
  }

  await browser.close();
  console.log('--- TEST COMPLETED ---');
})();
