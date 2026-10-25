const { chromium } = require('playwright');

(async () => {
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

  console.log('Navigating to home...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/home.html', { waitUntil: 'commit' });
  await page.waitForTimeout(1500);

  console.log('Navigating to fologin...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html', { waitUntil: 'commit' });
  await page.waitForTimeout(4000);

  const info = await page.evaluate(() => {
    const cInput = document.querySelector('#customCaptchaInput, input[name="captcha"], input[placeholder*="captcha" i]');
    if (!cInput) return { foundInput: false };

    const parent = cInput.parentElement;
    const grandparent = parent ? parent.parentElement : null;
    const imgs = Array.from(document.querySelectorAll('img')).map(img => ({
      id: img.id,
      className: img.className,
      src: img.src.substring(0, 100),
      width: img.width,
      height: img.height,
      alt: img.alt
    }));

    const canvases = Array.from(document.querySelectorAll('canvas')).map(can => ({
      id: can.id,
      className: can.className,
      width: can.width,
      height: can.height
    }));

    return {
      foundInput: true,
      inputId: cInput.id,
      parentHtml: parent ? parent.outerHTML.substring(0, 500) : null,
      grandparentHtml: grandparent ? grandparent.outerHTML.substring(0, 500) : null,
      imgs,
      canvases
    };
  });

  console.log('DOM info:', JSON.stringify(info, null, 2));

  // Take a screenshot of the captcha area
  const cInput = await page.$('#customCaptchaInput');
  if (cInput) {
    const container = await cInput.evaluateHandle(el => el.closest('.guideFieldNode, .form-group, div') || el.parentElement);
    if (container.asElement()) {
      await container.asElement().screenshot({ path: 'scratch_captcha_container.png' });
      console.log('Saved scratch_captcha_container.png');
    }
  }

  await browser.close();
})();
