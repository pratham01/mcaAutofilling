const { chromium } = require('playwright');

(async () => {
  console.log('=== DEEP DIVE: MCA AOC-4 NAVIGATION & BOTTLENECK ANALYSIS ===');

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

  console.log('1. Navigating directly to Form AOC-4 landing page...');
  const targetUrl = 'https://www.mca.gov.in/content/mca/global/en/mca/e-filing/annual-filings/form-aoc4.html';
  
  try {
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`HTTP Status: ${response ? response.status() : 'N/A'}`);
    console.log(`Current URL after navigation: ${page.url()}`);
  } catch (err) {
    console.error(`Navigation error: ${err.message}`);
  }

  await page.waitForTimeout(4000);
  console.log(`Final URL: ${page.url()}`);
  console.log(`Page Title: "${await page.title()}"`);

  // Analyze page content
  const analysis = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const forms = Array.from(document.querySelectorAll('form')).map(f => ({ id: f.id, action: f.action, name: f.name }));
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])')).map(i => ({
      id: i.id,
      name: i.name,
      type: i.type,
      placeholder: i.placeholder,
      label: i.getAttribute('aria-label') || '',
      visible: i.offsetParent !== null
    }));
    const buttons = Array.from(document.querySelectorAll('button, a.btn, input[type="button"], input[type="submit"], a[href*="aoc" i], a[href*="filing" i]')).map(b => ({
      tag: b.tagName,
      text: (b.innerText || b.textContent || b.value || '').trim(),
      href: b.getAttribute('href') || '',
      id: b.id,
      visible: b.offsetParent !== null
    })).filter(b => b.text.length > 0 || b.href.length > 0);

    const hasGuideContainer = !!document.querySelector('[id*="guideContainer"]');
    const hasCinField = !!document.querySelector('#CIN, #cin, input[name*="cin" i], input[placeholder*="CIN" i]');
    const hasAoc4Mention = text.toLowerCase().includes('aoc-4') || text.toLowerCase().includes('aoc 4') || text.toLowerCase().includes('aoc4');

    return {
      textSnippet: text.substring(0, 500).replace(/\s+/g, ' '),
      forms,
      inputsCount: inputs.length,
      sampleInputs: inputs.slice(0, 10),
      buttonsCount: buttons.length,
      sampleButtons: buttons.slice(0, 15),
      hasGuideContainer,
      hasCinField,
      hasAoc4Mention,
      isRedirectedToLogin: window.location.href.includes('fologin.html') || window.location.href.includes('login')
    };
  });

  console.log('\n--- DOM & CONTENT ANALYSIS ---');
  console.log(JSON.stringify(analysis, null, 2));

  console.log('\n=============================================================');
  console.log('  BROWSER IS OPEN AND WILL REMAIN OPEN FOR LIVE INSPECTION.');
  console.log('  DO NOT CLOSE THIS TERMINAL.');
  console.log('=============================================================');

  // DO NOT CLOSE BROWSER! Keep it open so user and agent can inspect
  await new Promise(() => {});
})();
