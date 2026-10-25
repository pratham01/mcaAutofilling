const { chromium } = require('playwright');

async function checkExtensions() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  await page.goto('chrome://extensions');
  await page.waitForTimeout(1500);

  // In chrome://extensions, there is shadow DOM. Let's inspect via JS
  const info = await page.evaluate(() => {
    const manager = document.querySelector('extensions-manager');
    if (!manager) return { error: 'no manager' };
    const itemList = manager.shadowRoot?.querySelector('extensions-item-list');
    if (!itemList) return { error: 'no item-list' };
    const items = itemList.shadowRoot?.querySelectorAll('extensions-item') || [];
    return Array.from(items).map(item => {
      const name = item.shadowRoot?.querySelector('#name')?.innerText;
      const id = item.id;
      const error = item.shadowRoot?.querySelector('#error-message')?.innerText;
      return { id, name, error };
    });
  });

  console.log('Extensions found on chrome://extensions:', JSON.stringify(info, null, 2));

  await page.close();
  await browser.disconnect();
}

checkExtensions().catch(console.error);
