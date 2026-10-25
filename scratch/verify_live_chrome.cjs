const { chromium } = require('playwright');

async function verify() {
  console.log('Connecting to Chrome on port 9222...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  console.log(`Connected! Contexts count: ${contexts.length}`);
  
  const defaultContext = contexts[0];
  const pages = defaultContext.pages();
  console.log(`Open pages: ${pages.length}`);
  for (const p of pages) {
    console.log(` - Page: "${await p.title()}" -> ${p.url()}`);
  }

  // Open the extension popup in a new tab to verify it renders and has no errors
  const extId = 'fignfifoniblkonapihmkfakmlgkbkcf';
  const popupUrl = `chrome-extension://${extId}/popup.html`;
  console.log(`Opening extension popup: ${popupUrl}`);
  
  const extPage = await defaultContext.newPage();
  const errors = [];
  extPage.on('pageerror', err => errors.push(err.message));
  extPage.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await extPage.goto(popupUrl);
  await extPage.waitForTimeout(1000);

  const title = await extPage.title();
  const bodyText = await extPage.innerText('body');
  const buttons = await extPage.$$eval('button', btns => btns.map(b => b.innerText.trim()));

  console.log(`Extension Popup Title: "${title}"`);
  console.log(`Buttons found:`, buttons);
  console.log(`Errors caught:`, errors);

  // Close the popup tab so user is left with FO Login page
  await extPage.close();
  await browser.disconnect();
  console.log('Verification completed successfully! Chrome remains open for user.');
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
