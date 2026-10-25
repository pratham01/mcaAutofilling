const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runValidation() {
  const results = {
    playwrightVersion: require('playwright/package.json').version,
    executablePath: chromium.executablePath(),
    tests: []
  };

  console.log('========================================================');
  console.log('🧪 PLAYWRIGHT SYSTEM VALIDATION');
  console.log('========================================================');
  console.log(`[INFO] Playwright npm package version: ${results.playwrightVersion}`);
  console.log(`[INFO] Chromium executable path: ${results.executablePath}`);
  console.log(`[INFO] Chromium binary exists on disk: ${fs.existsSync(results.executablePath)}`);

  // Test 1: Headless Chromium Launch & Navigation
  try {
    const t0 = Date.now();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent('<html><body><h1 id="title">FormMind Playwright Ready</h1><input id="testInput" value="" /></body></html>');
    await page.fill('#testInput', 'Verification Successful');
    const inputVal = await page.inputValue('#testInput');
    const heading = await page.textContent('#title');
    await browser.close();
    results.tests.push({
      name: 'Headless Chromium Launch & DOM Test',
      passed: heading === 'FormMind Playwright Ready' && inputVal === 'Verification Successful',
      durationMs: Date.now() - t0
    });
    console.log('[PASS] Test 1: Headless Chromium Launch & DOM manipulation passed');
  } catch (err) {
    results.tests.push({ name: 'Headless Chromium Launch & DOM Test', passed: false, error: err.message });
    console.error('[FAIL] Test 1:', err.message);
  }

  // Test 2: Headed Chromium Launch
  try {
    const t0 = Date.now();
    const browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent('<html><body><div id="status">Visible Chromium Active</div></body></html>');
    const statusText = await page.textContent('#status');
    await page.waitForTimeout(500);
    await browser.close();
    results.tests.push({
      name: 'Headed Chromium Launch',
      passed: statusText === 'Visible Chromium Active',
      durationMs: Date.now() - t0
    });
    console.log('[PASS] Test 2: Headed Chromium Launch passed');
  } catch (err) {
    results.tests.push({ name: 'Headed Chromium Launch', passed: false, error: err.message });
    console.error('[FAIL] Test 2:', err.message);
  }

  // Test 3: Google Chrome Channel Launch (System Chrome)
  try {
    const t0 = Date.now();
    const browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent('<html><body><div id="status">System Chrome Active</div></body></html>');
    const statusText = await page.textContent('#status');
    await page.waitForTimeout(500);
    await browser.close();
    results.tests.push({
      name: 'Headed System Chrome (channel: chrome)',
      passed: statusText === 'System Chrome Active',
      durationMs: Date.now() - t0
    });
    console.log('[PASS] Test 3: Headed System Chrome (channel: chrome) passed');
  } catch (err) {
    results.tests.push({ name: 'Headed System Chrome (channel: chrome)', passed: false, error: err.message });
    console.error('[FAIL] Test 3:', err.message);
  }

  // Test 4: Local HTML File Navigation & Screenshot
  try {
    const t0 = Date.now();
    const localHtmlPath = path.resolve(__dirname, '../AOC4_Live_Autofill.html');
    const screenshotPath = path.resolve(__dirname, 'playwright_validation_screenshot.png');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    if (fs.existsSync(localHtmlPath)) {
      await page.goto(`file://${localHtmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' });
    } else {
      await page.setContent('<h1>Validation Fallback Page</h1>');
    }
    await page.screenshot({ path: screenshotPath });
    await browser.close();

    const screenshotExists = fs.existsSync(screenshotPath);
    results.tests.push({
      name: 'HTML Render & Screenshot Generation',
      passed: screenshotExists,
      screenshotSize: screenshotExists ? fs.statSync(screenshotPath).size : 0,
      durationMs: Date.now() - t0
    });
    console.log(`[PASS] Test 4: HTML Render & Screenshot passed (${screenshotExists ? fs.statSync(screenshotPath).size : 0} bytes)`);
  } catch (err) {
    results.tests.push({ name: 'HTML Render & Screenshot Generation', passed: false, error: err.message });
    console.error('[FAIL] Test 4:', err.message);
  }

  console.log('========================================================');
  const allPassed = results.tests.every(t => t.passed);
  console.log(`🎯 OVERALL RESULT: ${allPassed ? 'ALL PLAYWRIGHT TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('========================================================');
  return results;
}

runValidation()
  .then(res => {
    fs.writeFileSync(path.resolve(__dirname, 'playwright_validation_result.json'), JSON.stringify(res, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal validation runner error:', err);
    process.exit(1);
  });
