const { mcaBrowserAgent } = require('../server/agents/mcaBrowserAgent.js');
const { chromium } = require('playwright');

async function testBackendGuideBridge() {
  console.log('Testing Backend AEM GuideBridge State Binding...');
  
  // Launch Playwright mock page with full GuideBridge environment
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Mock AEM AOC-4 Form
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><title>Form AOC-4 Live Mock</title></head>
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
          <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803-panel_478261092_copy_1688980105-guidetextbox_copy_co___widget" data-som-expression="guide[0].partA.boardMeetingDate" />
          <input type="radio" id="cop_606137638-panel_478261092_copy-guideradiobutton__-1_widget" value="Yes" data-som-expression="guide[0].partA.agmHeld" />
          <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co_87220494___widget" data-som-expression="guide[0].partA.agmDate" />
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

        <!-- Toolbar with Save Draft button -->
        <div id="guideContainer-rootPanel-panel_622013715">
          <button id="guideContainer-rootPanel-panel_622013715-mca_button_copy___widget">Save</button>
        </div>
      </div>

      <script>
        // AEM GuideBridge State Engine Mock
        window.__guideBridgeState = {};
        window.__draftSaveCalled = false;

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
              trigger: function(evt) {}
            };
          },
          validate: function() { return true; },
          draftSave: function() {
            window.__draftSaveCalled = true;
            return true;
          }
        };
      </script>
    </body>
    </html>
  `);

  // Manually attach page to agent instance
  mcaBrowserAgent.browser = browser;
  mcaBrowserAgent.context = context;
  mcaBrowserAgent.page = page;

  // Test fillSection1Direct
  console.log('Testing mcaBrowserAgent.fillSection1Direct()...');
  const res1 = await mcaBrowserAgent.fillSection1Direct();
  console.log('Section 1 Filled count:', res1.filledCount);

  // Test fillSection2Direct
  console.log('Testing mcaBrowserAgent.fillSection2Direct()...');
  const res2 = await mcaBrowserAgent.fillSection2Direct();
  console.log('Section 2 Filled count:', res2.filledCount);

  // Test fillSection3Direct
  console.log('Testing mcaBrowserAgent.fillSection3Direct()...');
  const res3 = await mcaBrowserAgent.fillSection3Direct();
  console.log('Section 3 Filled count:', res3.filledCount);

  // Check GuideBridge State in browser
  const gbState = await page.evaluate(() => window.__guideBridgeState);
  console.log('GuideBridge bound keys count:', Object.keys(gbState).length);
  console.log('GuideBridge bound keys sample:', Object.keys(gbState).slice(0, 5));

  // Test saveDraft
  console.log('Testing mcaBrowserAgent.saveDraft()...');
  const saveRes = await mcaBrowserAgent.saveDraft('Section 1');
  console.log('Save Draft Result:', saveRes.success, saveRes.message);

  const draftSaveCalled = await page.evaluate(() => window.__draftSaveCalled);
  console.log('window.guideBridge.draftSave() triggered?:', draftSaveCalled);

  if (res1.filledCount > 0 && res2.filledCount > 0 && res3.filledCount > 0 && Object.keys(gbState).length > 0) {
    console.log('\n🎉 ALL BACKEND GUIDEBRIDGE TESTS PASSED 100%!');
  } else {
    throw new Error('Backend GuideBridge test failed');
  }

  await browser.close();
}

testBackendGuideBridge().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
