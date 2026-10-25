const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE MCA AOC-4 EXTENSION & GUIDEBRIDGE TESTS');
  console.log('================================================================\n');

  // Step 1: Validate files and syntax
  console.log('--- Step 1: Validating Extension Files & Syntax ---');
  const manifestPath = path.resolve('extension/manifest.json');
  const popupHtmlPath = path.resolve('extension/popup.html');
  const popupJsPath = path.resolve('extension/popup.js');
  const contentJsPath = path.resolve('extension/content.js');
  const pageBridgeJsPath = path.resolve('extension/pageBridge.js');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('✅ manifest.json: Valid JSON (Permissions:', manifest.permissions.join(', '), ')');
  if (!manifest.permissions.includes('tabs')) {
    throw new Error('FAIL: "tabs" permission is missing from manifest.json');
  }

  const popupCode = fs.readFileSync(popupJsPath, 'utf8');
  new Function(popupCode);
  console.log('✅ popup.js: Syntax Valid');

  const contentCode = fs.readFileSync(contentJsPath, 'utf8');
  new Function(contentCode);
  console.log('✅ content.js: Syntax Valid');

  const pageBridgeCode = fs.readFileSync(pageBridgeJsPath, 'utf8');
  new Function(pageBridgeCode);
  console.log('✅ pageBridge.js: Syntax Valid');

  // Step 2: In-browser verification with full mock AEM GuideBridge environment
  console.log('\n--- Step 2: Testing GuideBridge State Binding in Real Browser ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('  [BROWSER ERROR]:', msg.text());
  });

  // Mock AEM Adaptive Form Page
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><title>Form AOC-4 Mock</title></head>
    <body>
      <div id="guideContainer-rootPanel">
        <!-- Section 1 (Part A) -->
        <div id="guideContainer-rootPanel-panel-panel-panel1AOC4">
          <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel-panel-guidetextbox___widget" data-som-expression="guide[0].partA.cin" />
          <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy___widget" data-som-expression="guide[0].partA.compName" />
          <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_673278796___widget" data-som-expression="guide[0].partA.address" />
          <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_375806483___widget" data-som-expression="guide[0].partA.email" />
          <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092_copy-panel_252196987-guidetextbox_copy___widget" data-som-expression="guide[0].partA.fyFrom" />
          <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092_copy-panel_252196987-guidetextbox_copy_673278796___widget" data-som-expression="guide[0].partA.fyTo" />
          <input type="radio" id="cop_606137638-panel_478261092_copy-guideradiobutton__-1_widget" value="Yes" data-som-expression="guide[0].partA.agmHeld" />
        </div>

        <!-- Section 2 (Balance Sheet) -->
        <div id="guideContainer-rootPanel-panel-panel-panel3AOC4">
          <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget" data-som-expression="guide[0].balanceSheet.shareCapitalCur" />
          <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget" data-som-expression="guide[0].balanceSheet.shareCapitalPrev" />
          <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643810517442-tableItem1643810517445___widget" data-som-expression="guide[0].balanceSheet.reservesCur" />
        </div>

        <!-- Section 3 (Profit & Loss) -->
        <div id="guideContainer-rootPanel-panel-panel-panel6AOC4">
          <input id="guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633805___widget" data-som-expression="guide[0].pnl.revOpsCur" />
          <input id="guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633806___widget" data-som-expression="guide[0].pnl.revOpsPrev" />
        </div>

        <!-- Toolbar -->
        <div id="guideContainer-rootPanel-panel_622013715">
          <button id="guideContainer-rootPanel-panel_622013715-mca_button_copy___widget">Save Draft</button>
        </div>
      </div>

      <script>
        // AEM GuideBridge State Engine Mock
        window.__guideBridgeState = {};
        window.__draftSaveTriggered = false;

        window.guideBridge = {
          connect: function(cb) { if (cb) cb(); },
          setProperty: function(somList, propName, valueList) {
            if (propName === 'value' && somList && valueList) {
              for (let i = 0; i < somList.length; i++) {
                window.__guideBridgeState[somList[i]] = valueList[i];
              }
            }
          },
          resolveNode: function(som) {
            return {
              som: som,
              get value() { return window.__guideBridgeState[som]; },
              set value(v) { window.__guideBridgeState[som] = v; },
              validate: function() { return true; },
              trigger: function(evt) { /* trigger AEM calc */ }
            };
          },
          validate: function() { return true; },
          draftSave: function() {
            window.__draftSaveTriggered = true;
            return true;
          }
        };
      </script>
    </body>
    </html>
  `);

  // Inject PageBridge (Main world) and Content Script
  await page.addScriptTag({ content: pageBridgeCode });
  await page.addScriptTag({ content: contentCode });

  // Custom company financial data
  const testCompany = {
    companyInfo: {
      companyName: 'APEX HEALTHCARE PRIVATE LIMITED',
      cin: 'U85110MH2023PTC123456',
      address: 'UNIT 501, BANDRA KURLA COMPLEX, MUMBAI 400051',
      email: 'ACCOUNTS@APEXHEALTH.COM',
      financialYearFrom: '01/04/2025',
      financialYearTo: '31/03/2026',
      boardMeetingDate: '05/09/2026',
      agmHeld: 'Yes'
    },
    balanceSheet: [
      ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget', '2500000', 'Share Capital (Current)'],
      ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget', '2500000', 'Share Capital (Prev)'],
      ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643810517442-tableItem1643810517445___widget', '750000', 'Reserves (Current)']
    ],
    profitAndLoss: [
      ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633805___widget', '8400000', 'Revenue from Ops (Current)'],
      ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633806___widget', '6200000', 'Revenue from Ops (Prev)']
    ]
  };

  // Test Section 1 Fill
  console.log('Testing Section 1 Auto-Fill...');
  const s1Filled = await page.evaluate((data) => {
    return window.__MCA_AOC4_AUTOFILL__.fillSection1(data);
  }, testCompany);
  console.log(`  -> Filled ${s1Filled.length} items in Section 1`);

  // Test Section 2 Fill
  console.log('Testing Section 2 (Balance Sheet) Auto-Fill...');
  const s2Filled = await page.evaluate((data) => {
    return window.__MCA_AOC4_AUTOFILL__.fillSection2(data);
  }, testCompany);
  console.log(`  -> Filled ${s2Filled.length} items in Balance Sheet`);

  // Test Section 3 Fill
  console.log('Testing Section 3 (Profit & Loss) Auto-Fill...');
  const s3Filled = await page.evaluate((data) => {
    return window.__MCA_AOC4_AUTOFILL__.fillSection3(data);
  }, testCompany);
  console.log(`  -> Filled ${s3Filled.length} items in Profit & Loss`);

  // Test Global Save Draft
  console.log('Testing Global Draft Save...');
  const saveRes = await page.evaluate(() => {
    return window.__MCA_AOC4_AUTOFILL__.triggerGlobalSaveDraft();
  });
  console.log('  -> Save result:', saveRes);

  // Verify DOM values
  const domValues = await page.evaluate(() => ({
    cin: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel-panel-guidetextbox___widget').value,
    companyName: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy___widget').value,
    address: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_673278796___widget').value,
    email: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_375806483___widget').value,
    fyFrom: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092_copy-panel_252196987-guidetextbox_copy___widget').value,
    fyTo: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092_copy-panel_252196987-guidetextbox_copy_673278796___widget').value,
    shareCapCur: document.getElementById('guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget').value,
    revOpsCur: document.getElementById('guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633805___widget').value
  }));

  // Verify GuideBridge State
  const gbState = await page.evaluate(() => ({
    guideBridgeState: window.__guideBridgeState,
    draftSaveCalled: window.__draftSaveTriggered
  }));

  console.log('\n--- VERIFICATION OF DOM VALUES ---');
  console.log('CIN:', domValues.cin);
  console.log('Company Name:', domValues.companyName);
  console.log('Address:', domValues.address);
  console.log('Email:', domValues.email);
  console.log('FY From:', domValues.fyFrom);
  console.log('FY To:', domValues.fyTo);
  console.log('Share Capital (Current):', domValues.shareCapCur);
  console.log('Revenue from Operations (Current):', domValues.revOpsCur);

  console.log('\n--- VERIFICATION OF GUIDEBRIDGE STATE BINDING ---');
  console.log('GuideBridge Bound Nodes Count:', Object.keys(gbState.guideBridgeState).length);
  console.log('GuideBridge Bound State:', gbState.guideBridgeState);
  console.log('GuideBridge Native draftSave Called?:', gbState.draftSaveCalled);

  // Assertions
  if (domValues.cin !== 'U85110MH2023PTC123456') throw new Error('CIN DOM value mismatch');
  if (domValues.companyName !== 'APEX HEALTHCARE PRIVATE LIMITED') throw new Error('Company Name DOM value mismatch');
  if (domValues.shareCapCur !== '2500000') throw new Error('Share Capital DOM value mismatch');
  if (domValues.revOpsCur !== '8400000') throw new Error('Revenue DOM value mismatch');
  if (Object.keys(gbState.guideBridgeState).length < 5) throw new Error('GuideBridge state was not bound!');
  if (!gbState.draftSaveCalled) throw new Error('GuideBridge draftSave was not triggered!');

  console.log('\n================================================================');
  console.log('🎉 ALL TESTS PASSED: EXTENSION & AEM GUIDEBRIDGE STATE BINDING CONFIRMED 100% OPERATIONAL!');
  console.log('================================================================\n');

  await browser.close();
})();
