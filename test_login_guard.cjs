const { chromium } = require('playwright');

async function checkLoginStatus(page) {
  return await page.evaluate(() => {
    const url = window.location.href;

    // 1. If still on fologin.html, DEFINITELY NOT logged in
    if (url.includes('fologin.html')) {
      return { loggedIn: false, reason: 'Still on fologin.html (login / OTP screen)' };
    }

    // 2. Check for explicit sign out / logout indicators in DOM
    const signoutSelectors = [
      '#signout',
      '#logout',
      'a[href*="logout" i]',
      'a[href*="signout" i]',
      'a[href*="fologout" i]',
      'button[id*="logout" i]',
      'button[id*="signout" i]',
    ];
    for (const sel of signoutSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        return { loggedIn: true, reason: `Found visible signout element: ${sel}` };
      }
    }

    // Check links/buttons with text "Sign Out" or "Log Out" or "Logout"
    const allLinksAndButtons = Array.from(document.querySelectorAll('a, button, span, div.logout'));
    for (const el of allLinksAndButtons) {
      const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (txt === 'sign out' || txt === 'signout' || txt === 'log out' || txt === 'logout') {
        if (el.offsetParent !== null) {
          return { loggedIn: true, reason: `Found visible text: "${txt}"` };
        }
      }
    }

    // 3. Check for authenticated URLs (dashboard / my-applications / authenticated foportal)
    if (url.includes('user-dashboard') || url.includes('my-applications')) {
      return { loggedIn: true, reason: `Authenticated URL detected: ${url}` };
    }

    if (url.includes('/foportal/foportal.html') && !url.includes('fologin')) {
      const hasLoginForm = !!document.querySelector('input[id*="guidetextbox___widget"], #customCaptchaInput');
      if (!hasLoginForm) {
        return { loggedIn: true, reason: `FO Portal dashboard detected: ${url}` };
      }
    }

    // 4. Default: NOT logged in
    return { loggedIn: false, reason: `Public page without signout: ${url}` };
  }).catch(err => ({ loggedIn: false, reason: `Evaluation error: ${err.message}` }));
}

(async () => {
  console.log('--- STARTING PLAYWRIGHT LOGIN GUARD TEST ---');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--start-maximized',
      '--window-size=1400,900',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Google Chrome";v="124", "Chromium";v="124", "Not?A_Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  await context.addInitScript(() => {
    try { delete Object.getPrototypeOf(navigator).webdriver; } catch (_) {}
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();
  await page.route('**/clientlib-devtool.js*', route => route.abort());

  console.log('1. Priming session via home.html...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/home.html', { waitUntil: 'commit' });
  await page.waitForTimeout(1500);

  // Test on home.html: MUST be loggedIn: false
  const homeStatus = await checkLoginStatus(page);
  console.log(`Status on home.html (MUST BE FALSE):`, homeStatus);
  if (homeStatus.loggedIn) {
    console.error('FAIL: home.html was incorrectly marked as loggedIn!');
    await browser.close();
    process.exit(1);
  }

  console.log('2. Navigating to fologin.html...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html', { waitUntil: 'commit' });
  await page.waitForTimeout(2500);

  // Pre-fill credentials
  console.log('3. Pre-filling credentials...');
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

  console.log(`   User filled: ${userFilled}, Pass filled: ${passFilled}`);

  // Test on fologin.html: MUST be loggedIn: false
  const loginStatus = await checkLoginStatus(page);
  console.log(`Status on fologin.html before CAPTCHA (MUST BE FALSE):`, loginStatus);
  if (loginStatus.loggedIn) {
    console.error('FAIL: fologin.html was incorrectly marked as loggedIn!');
    await browser.close();
    process.exit(1);
  }

  console.log('4. Simulating 5 check cycles (10 seconds) without CAPTCHA...');
  for (let i = 1; i <= 5; i++) {
    await page.waitForTimeout(2000);
    const s = await checkLoginStatus(page);
    console.log(`   Cycle ${i}: loggedIn=${s.loggedIn} (${s.reason})`);
    if (s.loggedIn) {
      console.error(`FAIL on cycle ${i}: Proceeded prematurely!`);
      await browser.close();
      process.exit(1);
    }
  }

  console.log('✅ SUCCESS: System safely held without proceeding! No premature advancement occurred.');
  await browser.close();
  console.log('--- TEST COMPLETE ---');
})();
