const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const extPath = path.resolve('extension');
  const context = await chromium.launchPersistentContext('', {
    headless: true,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`
    ]
  });

  const page = await context.newPage();
  await page.goto('https://www.mca.gov.in/content/mca/global/en/home.html', { waitUntil: 'commit' });

  // Inject Section 1, 2, 3 dummy elements
  await page.evaluate(() => {
    history.pushState({}, '', '/content/mca/global/en/mca/e-filing/annual-filings/form-aoc4.html');

    const gc = document.createElement('div');
    gc.id = 'guideContainer';

    // Section 1: CIN
    const cin = document.createElement('input');
    cin.id = 'guideContainer-rootPanel-panel-panel-panel1AOC4-panel-panel-guidetextbox___widget';
    gc.appendChild(cin);

    // Section 2: Share Capital
    const sc = document.createElement('input');
    sc.id = 'guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget';
    gc.appendChild(sc);

    // Section 3: Revenue from Ops
    const rev = document.createElement('input');
    rev.id = 'guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633805___widget';
    gc.appendChild(rev);

    document.body.appendChild(gc);
  });

  const contentCode = fs.readFileSync('extension/content.js', 'utf8');
  const res = await page.evaluate((code) => {
    const fn = new Function(code + `
      return {
        sec1: fillSection1(),
        sec2: fillSection2(),
        sec3: fillSection3(),
        cinVal: document.getElementById('guideContainer-rootPanel-panel-panel-panel1AOC4-panel-panel-guidetextbox___widget').value,
        scVal: document.getElementById('guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget').value,
        revVal: document.getElementById('guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633805___widget').value
      };
    `);
    return fn();
  }, contentCode);

  console.log('--- ALL SECTIONS TEST RESULT ---');
  console.log('Section 1 items filled:', res.sec1.length, '| CIN value:', res.cinVal);
  console.log('Section 2 items filled:', res.sec2.length, '| Share Capital value:', res.scVal);
  console.log('Section 3 items filled:', res.sec3.length, '| Revenue value:', res.revVal);

  await context.close();
})();
