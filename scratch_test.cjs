const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Google Chrome";v="124", "Chromium";v="124", "Not?A_Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1',
    }
  });

  await context.addInitScript(() => {
    try { delete Object.getPrototypeOf(navigator).webdriver; } catch (_) {}
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();
  await page.route('**/clientlib-devtool.js*', route => route.abort());

  console.log('1. Priming home.html...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/home.html', { waitUntil: 'commit' });
  await page.waitForTimeout(1500);

  console.log('2. Navigating to fologin.html...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html', { waitUntil: 'commit' });
  await page.waitForTimeout(3000);

  console.log('3. Filling credentials with widget selectors...');
  const userFilled = await page.evaluate((val) => {
    const el = document.querySelector('input[id*="guidetextbox___widget"], #userId');
    if (el) {
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }, 'pratham.bpl.pb@gmail.com');

  const passFilled = await page.evaluate((val) => {
    const el = document.querySelector('input[id*="guidepasswordbox___widget"], #password');
    if (el) {
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }, 'Bajaj@1234');

  console.log('User ID filled:', userFilled);
  console.log('Password filled:', passFilled);

  const captchaFocused = await page.evaluate(() => {
    const c = document.querySelector('#customCaptchaInput');
    if (c) {
      c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      c.focus();
      return true;
    }
    return false;
  });
  console.log('Captcha focused:', captchaFocused);

  // Check login condition: MUST be false!
  const isUserLoggedIn = await page.evaluate(() => {
    const url = window.location.href;
    if (url.includes('fologin.html') || url.includes('home.html')) {
      // Check if signout exists
      const signout = document.querySelector('#signout, a[href*="logout" i]');
      return !!signout && signout.offsetParent !== null;
    }
    return url.includes('dashboard') || url.includes('my-applications');
  });

  console.log('Is user logged in (must be false!):', isUserLoggedIn);
  await browser.close();
})();
