const { chromium } = require('playwright');

(async () => {
  console.log('Testing FormMind Web Application UI...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check Orchestrator Online indicator
  const statusOnline = await page.$('text=Orchestrator Online');
  console.log('Orchestrator Online status:', !!statusOnline);

  // Check Step 1 inputs
  const userInput = await page.$('input[value="pratham.bpl.pb@gmail.com"]');
  console.log('User email input present:', !!userInput);

  // Take screenshot of Initial State
  await page.screenshot({ path: 'scratch/app_step1_ready.png', fullPage: true });

  // Test API endpoint for checking session directly
  const sessionRes = await page.evaluate(async () => {
    const res = await fetch('/api/aoc4/check-session');
    return await res.json();
  });
  console.log('Session response:', sessionRes);

  // Test Ingest Excel through UI/API
  const parseRes = await page.evaluate(async () => {
    const res = await fetch('/api/aoc4/parse-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: 'D:\\SONAL_WORK_BACKUP\\SONAL_WORK_BACKUP\\CA SANDIP SARDA\\ANNUAL FILING\\2026-27\\GURPREET SALUJA\\GurpreetSaluja_Financials_2025-26.xls'
      })
    });
    return await res.json();
  });
  console.log('Parsed company from UI:', parseRes.summary?.company);
  console.log('Parsed CIN from UI:', parseRes.summary?.cin);

  // Generate mapping
  const mapRes = await page.evaluate(async () => {
    const res = await fetch('/api/aoc4/generate-mapping', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    return await res.json();
  });
  console.log('Total Mappings from UI:', mapRes.mappings?.length);
  console.log('Validation status from UI:', mapRes.validation);

  await browser.close();
  console.log('Test completed successfully.');
})();
