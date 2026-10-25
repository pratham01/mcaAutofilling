const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const extPath = path.resolve('extension');
  console.log('Testing extension at:', extPath);

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`
    ]
  });

  const page = await context.newPage();
  
  // Go to MCA home
  console.log('Navigating to mca.gov.in...');
  await page.goto('https://www.mca.gov.in/content/mca/global/en/home.html', { waitUntil: 'commit' });
  await page.waitForTimeout(2000);

  // Read saved elements from sec1_elements_live.json
  const elements = JSON.parse(fs.readFileSync('scratch/sec1_elements_live.json', 'utf8'));

  // Inject elements into DOM to simulate AOC-4 page
  await page.evaluate((els) => {
    history.pushState({}, '', '/content/mca/global/en/mca/e-filing/annual-filings/form-aoc4.html');

    const container = document.createElement('div');
    container.id = 'guideContainer';
    els.forEach(e => {
      if (e.id) {
        let node;
        if (e.tag === 'select') {
          node = document.createElement('select');
          const opt1 = document.createElement('option');
          opt1.value = '1';
          opt1.text = 'Adopted by AGM';
          node.appendChild(opt1);
        } else if (e.tag === 'button') {
          node = document.createElement('button');
          node.innerText = e.text || 'Search';
        } else {
          node = document.createElement('input');
          node.type = e.id.includes('radio') ? 'radio' : 'text';
          if (node.type === 'radio') {
            node.name = e.id.split('-')[0];
          }
        }
        node.id = e.id;
        node.className = e.className || '';
        container.appendChild(node);
      }
    });
    document.body.appendChild(container);
  }, elements);

  console.log('Simulated DOM created. Running content.js logic...');

  const contentJsCode = fs.readFileSync('extension/content.js', 'utf8');

  const evalResult = await page.evaluate((code) => {
    try {
      const runner = new Function(code + `
        return {
          res1: typeof fillSection1 === 'function' ? fillSection1() : 'not a function',
          res2: typeof fillSection2 === 'function' ? fillSection2() : 'not a function',
          res3: typeof fillSection3 === 'function' ? fillSection3() : 'not a function'
        };
      `);
      return runner();
    } catch (err) {
      return { error: err.message, stack: err.stack };
    }
  }, contentJsCode);

  console.log('--- EVALUATION RESULT ---');
  console.log('res1:', evalResult.res1);
  console.log('res2:', evalResult.res2);
  console.log('res3:', evalResult.res3);
  if (evalResult.error) console.error('Error:', evalResult.error, evalResult.stack);

  // Check what values were actually written into the DOM inputs!
  const filledValues = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('#guideContainer input, #guideContainer select'));
    return inputs.filter(i => i.value).map(i => ({ id: i.id, val: i.value }));
  });

  console.log(`--- DOM INPUTS ACTUALLY FILLED: ${filledValues.length} ---`);
  filledValues.forEach(f => console.log(`  [${f.id.split('-').pop()}]: "${f.val}"`));

  await context.close();
})();
