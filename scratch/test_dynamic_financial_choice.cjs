const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  console.log('Testing dynamic financial file choice logic in browser...');

  const popupCode = fs.readFileSync(path.join(__dirname, '../extension/popup.js'), 'utf8');
  const contentCode = fs.readFileSync(path.join(__dirname, '../extension/content.js'), 'utf8');

  // Verify syntax
  new Function(popupCode);
  console.log('✅ popup.js syntax: VALID');
  new Function(contentCode);
  console.log('✅ content.js syntax: VALID');

  const testCompany = {
    companyInfo: {
      name: 'GLOBAL TECH CONSULTING PRIVATE LIMITED',
      cin: 'U72900DL2022PTC398765',
      address: 'BUILDING 10, DLF CYBER CITY, GURUGRAM, HARYANA 122002',
      email: 'COMPLIANCE@GLOBALTECH.COM'
    },
    balanceSheet: {
      shareCapital: 5000000,
      reservesAndSurplus: 1250000,
      longTermBorrowings: 800000,
      tradePayables: 45000,
      otherCurrentLiabilities: 120000,
      shortTermProvisions: 65000,
      tangibleAssets: 3500000,
      deferredTaxAsset: 12000,
      tradeReceivables: 1800000,
      cashAndEquivalents: 950000,
      otherCurrentAssets: 88000
    },
    balanceSheetPrevYear: {
      shareCapital: 5000000,
      reservesAndSurplus: 900000,
      longTermBorrowings: 1100000,
      tradePayables: 32000,
      otherCurrentLiabilities: 90000,
      shortTermProvisions: 50000,
      tangibleAssets: 3200000,
      deferredTaxAsset: 10000,
      tradeReceivables: 1400000,
      cashAndEquivalents: 620000,
      otherCurrentAssets: 70000
    },
    profitAndLoss: {
      revenueFromOperations: 12000000,
      otherIncome: 150000,
      employeeExpenses: 6500000,
      financeCosts: 110000,
      depreciation: 320000,
      adminExpenses: 2100000,
      currentTax: 620000,
      profitAfterTax: 2500000
    },
    profitAndLossPrevYear: {
      revenueFromOperations: 9500000,
      otherIncome: 80000,
      employeeExpenses: 5200000,
      financeCosts: 140000,
      depreciation: 280000,
      adminExpenses: 1700000,
      currentTax: 450000,
      profitAfterTax: 1810000
    }
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Create a minimal HTML page simulating MCA AOC-4
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <div id="guideContainer-rootPanel-panel-panel-panel1AOC4">
        <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel-panel-guidetextbox___widget" />
        <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy___widget" />
        <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_673278796___widget" />
        <input id="guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_375806483___widget" />
      </div>
      <div id="guideContainer-rootPanel-panel-panel-panel3AOC4">
        <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget" />
        <input id="guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget" />
      </div>
      <div id="guideContainer-rootPanel-panel-panel-panel6AOC4">
        <input id="guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633805___widget" />
      </div>
    </body>
    </html>
  `);

  // Inject content script
  await page.addScriptTag({ content: contentCode });

  // Test transformFinancialData function
  const transformed = await page.evaluate(({ code, data }) => {
    const fnStr = code.slice(code.indexOf('function safeRound'), code.indexOf('document.addEventListener'));
    const fn = new Function('fd', fnStr + '; return transformFinancialData(fd);');
    return fn(data);
  }, { code: popupCode, data: testCompany });

  console.log('Transformed Company:', transformed.companyInfo.companyName, '| CIN:', transformed.companyInfo.cin);

  // Fill Section 1 with custom transformed company data
  const s1Res = await page.evaluate((customData) => {
    return window.__MCA_AOC4_AUTOFILL__.fillSection1(customData);
  }, transformed);
  console.log('Section 1 populated fields:', s1Res.length);

  // Fill Section 2 with custom balance sheet
  const s2Res = await page.evaluate((customData) => {
    return window.__MCA_AOC4_AUTOFILL__.fillSection2(customData);
  }, transformed);
  console.log('Section 2 populated fields:', s2Res.length);

  // Fill Section 3 with custom P&L
  const s3Res = await page.evaluate((customData) => {
    return window.__MCA_AOC4_AUTOFILL__.fillSection3(customData);
  }, transformed);
  console.log('Section 3 populated fields:', s3Res.length);

  // Check DOM values
  const domValues = await page.evaluate(() => {
    return {
      cin: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel-panel-guidetextbox___widget').value,
      companyName: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy___widget').value,
      address: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_673278796___widget').value,
      email: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_375806483___widget').value,
      shareCapitalCur: document.getElementById('guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget').value,
      shareCapitalPrev: document.getElementById('guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget').value,
      revenueOpsCur: document.getElementById('guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633805___widget').value
    };
  });

  console.log('\n--- VERIFIED DOM FILLED VALUES ---');
  console.log('CIN:', domValues.cin);
  console.log('Company Name:', domValues.companyName);
  console.log('Address:', domValues.address);
  console.log('Email:', domValues.email);
  console.log('Share Capital (Current):', domValues.shareCapitalCur);
  console.log('Share Capital (Prev):', domValues.shareCapitalPrev);
  console.log('Revenue from Operations (Current):', domValues.revenueOpsCur);

  if (
    domValues.cin === 'U72900DL2022PTC398765' &&
    domValues.companyName === 'GLOBAL TECH CONSULTING PRIVATE LIMITED' &&
    domValues.shareCapitalCur === '5000000' &&
    domValues.revenueOpsCur === '12000000'
  ) {
    console.log('\n🎉 ALL CHECKS PASSED: Extension dynamically accepts and fills custom company files!');
  } else {
    console.error('\n❌ VALIDATION FAILED!');
    process.exit(1);
  }

  await browser.close();
})();
