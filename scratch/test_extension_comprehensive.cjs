// ==============================================================================
// Comprehensive Test Suite for MCA AOC-4 Chrome Extension Autofill Engine
// Tests: Backend Mappings, Data Normalization, DOM Autofill, and Previous Year Protection
// ==============================================================================

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE MCA AOC-4 EXTENSION AUTOFILL TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function runTest(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
    }
  }

  async function runAsyncTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: Backend Statutory Mapping API Validation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📦 TEST GROUP 1: Backend API & Schedule III Data Mappings');

  await runAsyncTest('GET /api/clients returns active client workspace', async () => {
    const resp = await fetch('http://localhost:3001/api/clients');
    assert.strictEqual(resp.status, 200, 'Expected 200 OK from /api/clients');
    const data = await resp.json();
    assert.ok(Array.isArray(data.clients), 'data.clients must be an array');
    assert.ok(data.clients.length >= 1, 'Should have at least 1 client workspace');
    assert.ok(data.activeCin, 'Should have activeCin set');
  });

  await runAsyncTest('GET /api/aoc4/mapping-state returns 27 BS & 16 P&L statutory mappings', async () => {
    const resp = await fetch('http://localhost:3001/api/aoc4/mapping-state');
    assert.strictEqual(resp.status, 200, 'Expected 200 OK from /api/aoc4/mapping-state');
    const data = await resp.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.partB_balanceSheet), 'partB_balanceSheet must be array');
    assert.ok(Array.isArray(data.partC_profitAndLoss), 'partC_profitAndLoss must be array');
    assert.strictEqual(data.partB_balanceSheet.length, 27, 'Schedule III Balance Sheet must have 27 rows');
    assert.strictEqual(data.partC_profitAndLoss.length, 16, 'Schedule III P&L must have 16 rows');

    // Verify key fields have selectors
    const shareCapital = data.partB_balanceSheet.find(r => r.id === 'bs_share_capital');
    assert.ok(shareCapital, 'Share Capital mapping must exist');
    assert.ok(shareCapital.currentSelector, 'Share Capital currentSelector must exist');
    assert.ok(shareCapital.previousSelector, 'Share Capital previousSelector must exist');
  });

  await runAsyncTest('GET /api/aoc4/financial-data returns unified payload for extension', async () => {
    const resp = await fetch('http://localhost:3001/api/aoc4/financial-data');
    assert.strictEqual(resp.status, 200, 'Expected 200 OK from /api/aoc4/financial-data');
    const data = await resp.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.mappingState || data.financialData, 'Must contain mappingState or financialData');
    assert.ok(data.partB_balanceSheet?.length === 27, 'Must expose partB_balanceSheet with 27 items');
    assert.ok(data.partC_profitAndLoss?.length === 16, 'Must expose partC_profitAndLoss with 16 items');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: Extension Popup Data Normalizer Unit Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n⚙️ TEST GROUP 2: Extension Data Normalizer (transformFinancialData)');

  // Extract transformFinancialData from popup.js
  const popupJsCode = fs.readFileSync(path.resolve(__dirname, '../extension/popup.js'), 'utf-8');
  // Evaluate helper in an isolated function scope
  const evalTransform = new Function(`
    ${popupJsCode.substring(popupJsCode.indexOf('const DEFAULT_COMPANY'), popupJsCode.indexOf('document.addEventListener'))}
    return { transformFinancialData, DEFAULT_COMPANY };
  `)();

  runTest('transformFinancialData preserves rich partB and partC arrays without stripping', () => {
    const sampleBackendData = {
      companyInfo: { cin: 'U72900KA2020PTC123456', companyName: 'Apex Tech' },
      partB_balanceSheet: [
        { id: 'bs_share_capital', label: 'Share Capital', currentReportingPeriod: '500000', previousReportingPeriod: '500000', currentSelector: '#cur_sc', previousSelector: '#prev_sc' }
      ],
      partC_profitAndLoss: [
        { id: 'pl_revenue_ops', label: 'Revenue', currentReportingPeriod: '1200000', previousReportingPeriod: '900000', currentSelector: '#cur_rev', previousSelector: '#prev_rev' }
      ]
    };

    const result = evalTransform.transformFinancialData(sampleBackendData);
    assert.strictEqual(result.partB_balanceSheet.length, 1, 'Must retain partB_balanceSheet');
    assert.strictEqual(result.partC_profitAndLoss.length, 1, 'Must retain partC_profitAndLoss');
    assert.strictEqual(result.companyInfo.cin, 'U72900KA2020PTC123456');
    assert.strictEqual(result.companyInfo.companyName, 'Apex Tech');
    assert.strictEqual(result.balanceSheet.length, 2, 'Must generate fallback tuples (Current + Prev)');
  });

  runTest('transformFinancialData handles empty or missing input gracefully', () => {
    const result = evalTransform.transformFinancialData(null);
    assert.strictEqual(result.companyInfo.companyName, 'No Client Selected');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: In-Browser Headless MCA AOC-4 DOM Autofill & Protection Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🌐 TEST GROUP 3: Headless Browser Autofill & MCA Pre-Fill Protection');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Load the content script code
  const contentJsCode = fs.readFileSync(path.resolve(__dirname, '../extension/content.js'), 'utf-8');

  // Fetch real mapping data from backend
  const mappingResp = await fetch('http://localhost:3001/api/aoc4/mapping-state');
  const mappingData = await mappingResp.json();
  const activeCin = mappingData.companyInfo?.cin || 'U67100PB2021PTC053453';

  // Construct a realistic MCA Form AOC-4 DOM
  const mockMcaHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>MCA AOC-4 Form Mock</title></head>
    <body>
      <!-- Section 1 (Part A) Panel -->
      <div id="panel1AOC4">
        <input id="CIN" value="${activeCin}" />
        <button id="autoSearchIcon">Search</button>
        <input id="panel1AOC4-panel-panel-guidetextbox___widget" value="" />
        <!-- Master data pre-populated by MCA -->
        <input id="panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy___widget" value="PRE_POPULATED_MCA_COMPANY_NAME" />
        <input id="panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_673278796___widget" value="PRE_POPULATED_MCA_ADDRESS" />
        <input id="panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_375806483___widget" value="mca_prefill@company.com" />
        <!-- Dates to be populated by user -->
        <input id="panel1AOC4-panel_478261092_copy-panel_252196987-guidetextbox_copy___widget" value="" />
        <input id="panel1AOC4-panel_478261092_copy-panel_252196987-guidetextbox_copy_673278796___widget" value="" />
        <input id="panel1AOC4-panel_2074267803-panel_478261092_copy_1688980105-guidetextbox_copy_co___widget" value="" />
        <select id="panel1AOC4-panel_2074267803-panel_478261092_copy_1688980105-panel_252196987-guidetextbox_copy___widget">
          <option value="">Select</option>
          <option value="Adopted by AGM">Adopted by AGM</option>
        </select>
        <input id="panel1AOC4-panel_2074267803_cop-panel_478261092_copy-guidetextbox_copy_co___widget" value="" />
        <input id="panel1AOC4-panel_2074267803_cop_606137638-guidedatepicker_423285079___widget" value="" />
        <input type="radio" value="Yes" id="cop_606137638-panel_478261092_copy-guideradiobutton__-1_widget" />
        <input id="panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co___widget" value="" />
        <input id="panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co_87220494___widget" value="" />
        <input type="radio" value="No" id="cop_606137638-panel_478261092_copy-guideradiobutton_cop__-2_widget" />
        <!-- Director 1 -->
        <input id="panel1AOC4-panel_2074267803-panel_478261092_copy_1688980105-table-Row1-tableItem1___widget" value="" />
        <input id="panel1AOC4-panel_2074267803-panel_478261092_copy_1688980105-table-Row1-headerItem1643788021607___widget" value="" />
      </div>

      <!-- Section 2 (Part B Balance Sheet) Panel -->
      <div id="panel3AOC4">
        <!-- Row 1: Share Capital -->
        <!-- Current Reporting Period (Empty on MCA) -->
        <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget" value="" />
        <!-- Previous Reporting Period (PRE-POPULATED BY MCA from last year!) -->
        <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget" value="999999" />

        <!-- Row 2: Reserves and Surplus -->
        <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643810517442-tableItem1643810517445___widget" value="" />
        <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643810517442-tableItem1643810517446___widget" value="-888888" />

        <!-- Row 3: Long-term Borrowings -->
        <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643811210415-tableItem1643811210419___widget" value="" />
        <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643811210415-tableItem1643811210420___widget" value="777777" />
      </div>

      <!-- Section 3 (Part C Profit & Loss) Panel -->
      <div id="panel6AOC4">
        <!-- Row 1: Revenue from Operations -->
        <input id="guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644085541248-tableItem1644085541251___widget" value="" />
        <!-- Previous Year pre-filled by MCA -->
        <input id="guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644085541248-tableItem1644085541252___widget" value="555555" />

        <!-- Row 2: Other Income -->
        <input id="guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644086710222-tableItem1644086710222___widget" value="" />
        <input id="guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644086710222-tableItem1644086710223___widget" value="444444" />
      </div>

      <!-- Global Save Draft Button -->
      <button id="guideContainer-rootPanel-panel_622013715-mca_button_copy___widget">Save</button>
    </body>
    </html>
  `;

  await page.setContent(mockMcaHtml);
  // Inject content script
  await page.evaluate(contentJsCode);

  // ── TEST 3.1: Section 1 Autofill with Pre-fill Protection ──────────────────
  await runAsyncTest('Section 1 Autofill populates missing dates and preserves MCA master data', async () => {
    const result = await page.evaluate(async (data) => {
      return window.__MCA_AOC4_AUTOFILL__.fillSection1(data, { protectPrevYear: true });
    }, mappingData);

    assert.ok(result.filledCount > 0, 'Must have filled fields');
    assert.ok(result.protectedCount >= 3, 'Must have protected Company Name, Address, and Email pre-fills');

    // Verify company name was NOT overwritten
    const compNameVal = await page.$eval('#panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy___widget', el => el.value);
    assert.strictEqual(compNameVal, 'PRE_POPULATED_MCA_COMPANY_NAME', 'Company name must not be overwritten');

    // Verify FY dates WERE populated
    const fyFromVal = await page.$eval('#panel1AOC4-panel_478261092_copy-panel_252196987-guidetextbox_copy___widget', el => el.value);
    assert.strictEqual(fyFromVal, '01/04/2025', 'FY From must be populated');
  });

  // ── TEST 3.2: Section 2 (Balance Sheet) Previous Year Protection ───────────
  await runAsyncTest('Section 2 (Balance Sheet) populates Current Year and strictly PRESERVES MCA Previous Year', async () => {
    // Current Year inputs start empty, Previous Year inputs have '999999', '-888888', '777777'
    const result = await page.evaluate(async (data) => {
      return window.__MCA_AOC4_AUTOFILL__.fillSection2(data, { protectPrevYear: true });
    }, mappingData);

    assert.ok(result.filledCount >= 3, 'Must fill Current Reporting Period inputs');
    assert.ok(result.protectedCount >= 3, 'Must protect 3 pre-populated Previous Year inputs');

    // Check Share Capital Current Year: should be filled from dataset ('100000')
    const curScVal = await page.$eval('#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget', el => el.value);
    assert.strictEqual(curScVal, '100000', 'Current Share Capital must be filled with 100000');

    // Check Share Capital Previous Year: MUST STILL BE '999999' (PRESERVED!)
    const prevScVal = await page.$eval('#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget', el => el.value);
    assert.strictEqual(prevScVal, '999999', 'Previous Share Capital MUST NOT BE OVERWRITTEN (Preserved MCA auto-population!)');

    // Check Reserves & Surplus Previous Year: MUST STILL BE '-888888'
    const prevRsVal = await page.$eval('#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643810517442-tableItem1643810517446___widget', el => el.value);
    assert.strictEqual(prevRsVal, '-888888', 'Previous Reserves & Surplus MUST NOT BE OVERWRITTEN');
  });

  // ── TEST 3.3: Section 3 (Profit & Loss) Previous Year Protection ─────────────
  await runAsyncTest('Section 3 (Profit & Loss) populates Current Year and strictly PRESERVES MCA Previous Year', async () => {
    const result = await page.evaluate(async (data) => {
      return window.__MCA_AOC4_AUTOFILL__.fillSection3(data, { protectPrevYear: true });
    }, mappingData);

    assert.ok(result.filledCount >= 2, 'Must fill Current Reporting Period inputs');
    assert.ok(result.protectedCount >= 2, 'Must protect 2 pre-populated Previous Year inputs');

    // Check Revenue Current: filled from dataset ('6972252')
    const curRevVal = await page.$eval('#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644085541248-tableItem1644085541251___widget', el => el.value);
    assert.strictEqual(curRevVal, '6972252', 'Current Revenue must be filled from dataset');

    // Check Revenue Previous: MUST STILL BE '555555' (PRESERVED!)
    const prevRevVal = await page.$eval('#guideContainer-rootPanel-panel-panel-panel6AOC4-panel_1650120016-panel-table-Row1644085541248-tableItem1644085541252___widget', el => el.value);
    assert.strictEqual(prevRevVal, '555555', 'Previous Revenue MUST NOT BE OVERWRITTEN (Preserved MCA auto-population!)');
  });

  // ── TEST 3.4: Overwrite Mode (When protection is explicitly toggled OFF) ───
  await runAsyncTest('Forced Overwrite Mode: Successfully overwrites previous year if user disables protection', async () => {
    // Now call with protectPrevYear = false
    const result = await page.evaluate(async (data) => {
      return window.__MCA_AOC4_AUTOFILL__.fillSection2(data, { protectPrevYear: false });
    }, mappingData);

    // Share Capital Previous Year should now be overwritten to dataset figure '100000'
    const prevScVal = await page.$eval('#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget', el => el.value);
    assert.strictEqual(prevScVal, '100000', 'In overwrite mode, previous year figure should be updated');
  });

  // ── TEST 3.5: Empty Field Fill (When Previous Year is NOT pre-populated on portal) ──
  await runAsyncTest('Empty Previous Year Field is safely populated when portal has no pre-fill', async () => {
    // Clear previous year input to simulate first-year or missing portal pre-fill
    await page.$eval('#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget', el => el.value = '');

    const result = await page.evaluate(async (data) => {
      return window.__MCA_AOC4_AUTOFILL__.fillSection2(data, { protectPrevYear: true });
    }, mappingData);

    // Because it was empty, it should be populated even though protectPrevYear = true
    const prevScVal = await page.$eval('#guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget', el => el.value);
    assert.strictEqual(prevScVal, '100000', 'Empty previous year field should be populated from dataset');
  });

  // ── TEST 3.6: Global Save Draft Trigger ───────────────────────────────────
  await runAsyncTest('Global Save Draft triggers the bottom toolbar save button', async () => {
    const result = await page.evaluate(async () => {
      return window.__MCA_AOC4_AUTOFILL__.triggerGlobalSaveDraft();
    });

    assert.strictEqual(result.success, true, 'Draft save must succeed');
    assert.strictEqual(result.method, 'globalSaveButton', 'Should click globalSaveButton');
  });

  // ── TEST 3.7: Floating Assistant Injection & Elements ────────────────────
  await runAsyncTest('Floating Assistant UI is present with protection toggle and action buttons', async () => {
    const panelExists = await page.$('#mca-aoc4-autofill-panel');
    assert.ok(panelExists, 'Floating assistant panel must exist in DOM');

    const protectCheckbox = await page.$('#mca-panel-chk-protect');
    assert.ok(protectCheckbox, 'Protection checkbox must exist on floating panel');
    const isChecked = await page.$eval('#mca-panel-chk-protect', el => el.checked);
    assert.strictEqual(isChecked, true, 'Protection checkbox must be checked by default');
  });

  await browser.close();

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}% Success Rate)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! The extension is robust, validated, and ready for production use.');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed.');
    process.exit(1);
  }
}

runComprehensiveTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
