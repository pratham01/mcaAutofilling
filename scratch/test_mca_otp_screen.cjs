const { chromium } = require('playwright');

(async () => {
  console.log('--- TESTING REAL MCA OTP MODAL ---');
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

  await page.goto('https://www.mca.gov.in/content/mca/global/en/home.html', { waitUntil: 'commit' });
  await page.waitForTimeout(1500);
  await page.goto('https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html', { waitUntil: 'commit' });
  await page.waitForTimeout(3000);

  // Type User ID & Password
  const userInput = await page.waitForSelector('input[id*="guidetextbox___widget"], #userId, input[name="userID"]');
  await userInput.click();
  await userInput.fill('');
  await userInput.type('pratham.bpl.pb@gmail.com', { delay: 25 });
  await userInput.press('Tab');
  await page.waitForTimeout(300);

  const passInput = await page.waitForSelector('input[id*="guidepasswordbox___widget"], #password, input[name="password"]');
  await passInput.click();
  await passInput.fill('');
  await passInput.type('Bajaj@1234', { delay: 25 });
  await passInput.press('Tab');
  await page.waitForTimeout(500);

  // Click Login
  const loginBtn = await page.waitForSelector('button:has-text("Login"), #login-submit');
  await loginBtn.click();

  // Wait for CAPTCHA modal
  await page.waitForSelector('#customCaptchaInput', { timeout: 15000 });
  console.log('CAPTCHA modal opened. Taking screenshot of modal...');
  await page.screenshot({ path: 'scratch_mca_captcha_before_submit.png' });

  // Let's inspect the Continue button and the modal structure
  const modalInfo = await page.evaluate(() => {
    const cInput = document.querySelector('#customCaptchaInput');
    const modal = cInput ? cInput.closest('.modal-content, .modal') : null;
    const btns = modal ? Array.from(modal.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(b => ({
      text: b.textContent?.trim(),
      id: b.id,
      className: b.className
    })) : [];
    return { btns, modalHtmlSnippet: modal ? modal.outerHTML.substring(0, 500) : '' };
  });

  console.log('Modal info:', JSON.stringify(modalInfo, null, 2));

  await browser.close();
})();
