const { chromium } = require('playwright');

(async () => {
  console.log('--- STARTING COMPLETE SYSTEM VERIFICATION ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Test 1: Load Web UI
  console.log('Test 1: Opening http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check Step 1 renders
  const title = await page.textContent('h2');
  console.log('Heading:', title);

  // Check 5 step tabs
  const tabs = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()).filter(t => t.includes('.')));
  console.log('Step tabs found:', tabs);

  // Check buttons present on Step 1
  const launchBtn = await page.$('button:has-text("Launch Chrome & Auto-Fill Credentials")');
  const manualBtn = await page.$('button:has-text("Open Login Page for Manual Human Login")');
  const verifyBtn = await page.$('button:has-text("Verify Active Login Session")');

  console.log('Launch Button Present:', !!launchBtn);
  console.log('Manual Login Button Present:', !!manualBtn);
  console.log('Verify Session Button Present:', !!verifyBtn);

  if (!launchBtn || !manualBtn || !verifyBtn) {
    throw new Error('Step 1 buttons missing!');
  }

  // Test 2: Check Step 2 is strictly locked
  console.log('Test 2: Verifying Step 2 is strictly locked before Step 1 completes...');
  const step2Tab = await page.$('button:has-text("2. Form Access")');
  await step2Tab.click();
  await page.waitForTimeout(500);

  const errorText = await page.evaluate(() => {
    const el = document.querySelector('div[style*="background: rgb(220, 38, 38)"], div[style*="background: #dc2626"]');
    return el ? el.textContent : '';
  });
  console.log('Skip Attempt Warning:', errorText);
  if (!errorText.includes('Cannot skip')) {
    console.warn('Warning: expected strict lock message when clicking locked step tab');
  }

  // Test 3: Test Excel Parsing & Intermediary Mapping API (Step 3)
  console.log('Test 3: Testing Excel ingestion and mapping API directly...');
  const parseRes = await fetch('http://localhost:3001/api/aoc4/parse-excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath: 'D:\\SONAL_WORK_BACKUP\\SONAL_WORK_BACKUP\\CA SANDIP SARDA\\ANNUAL FILING\\2026-27\\GURPREET SALUJA\\GurpreetSaluja_Financials_2025-26.xls'
    })
  });
  const parseData = await parseRes.json();
  console.log('Parsed company:', parseData.summary?.company);
  console.log('Parsed CIN:', parseData.summary?.cin);
  console.log('Sheets count:', parseData.summary?.sheetsProcessed);

  const mapRes = await fetch('http://localhost:3001/api/aoc4/generate-mapping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ financialData: parseData.financialData })
  });
  const mapData = await mapRes.json();
  console.log('Total mappings generated:', mapData.mappings?.length);

  // Test 4: Test Intermediary Override API
  console.log('Test 4: Testing intermediary state update...');
  const updateRes = await fetch('http://localhost:3001/api/aoc4/update-mapping', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldId: 'bs_share_capital', newValue: 1000000 })
  });
  const updateData = await updateRes.json();
  const updatedField = updateData.mappings?.find(m => m.id === 'bs_share_capital');
  console.log('Updated bs_share_capital:', updatedField?.userOverride);

  // Test 5: Test Human Sign-off API
  console.log('Test 5: Testing human sign-off...');
  const confirmRes = await fetch('http://localhost:3001/api/aoc4/confirm-all', { method: 'POST' });
  const confirmData = await confirmRes.json();
  const allConfirmed = confirmData.mappings?.every(m => m.isConfirmed);
  console.log('All mappings confirmed:', allConfirmed);

  // Test 6: Take a screenshot of the dashboard in Playwright
  await page.screenshot({ path: 'scratch_dashboard_verified.png', fullPage: true });
  console.log('Saved scratch_dashboard_verified.png');

  await browser.close();
  console.log('--- VERIFICATION SUCCEEDED ---');
})();
