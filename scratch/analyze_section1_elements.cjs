const http = require('http');
const fs = require('fs');
const path = require('path');

const get = (urlPath) => new Promise((resolve, reject) => {
  http.get(`http://localhost:3001${urlPath}`, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try { resolve(JSON.parse(d)); } catch (e) { resolve({ raw: d }); }
    });
  }).on('error', reject);
});

(async () => {
  console.log('1. Querying live DOM from active MCA browser...');
  const domRes = await get('/api/aoc4/inspect-dom');
  const elements = domRes.elements || [];
  console.log(`Retrieved ${elements.length} total elements from live MCA portal.`);

  // Filter Section 1 (Part A) / Company / General Info fields
  // Panel IDs in MCA AOC-4: panel1AOC4 is Section 1 (General Information & Statutory Dates)
  const sec1Elements = elements.filter(el => {
    const id = (el.id || '').toLowerCase();
    const row = (el.rowText || '').toLowerCase();
    return id.includes('panel1aoc4') || 
           id.includes('autosearchicon') ||
           row.includes('corporate identity') ||
           row.includes('financial year') ||
           row.includes('date of board of directors') ||
           row.includes('date of signing of reports') ||
           row.includes('annual general meeting') ||
           row.includes('nature of financial statements') ||
           row.includes('whether any extension for agm');
  });

  console.log(`\nFiltered to ${sec1Elements.length} Section 1 controls.\n`);

  const report = sec1Elements.map((el, i) => ({
    index: i + 1,
    tag: el.tag,
    type: el.type,
    id: el.id,
    value: el.value,
    placeholder: el.placeholder,
    text: el.text?.substring(0, 60),
    rowSnippet: el.rowText?.substring(0, 100),
  }));

  fs.writeFileSync('scratch/sec1_elements_live.json', JSON.stringify(report, null, 2));

  report.forEach(r => {
    console.log(`[#${r.index}] <${r.tag} type="${r.type}"> ID: ${r.id}`);
    console.log(`     Val: "${r.value}" | Placeholder: "${r.placeholder}"`);
    console.log(`     Row Context: "${r.rowSnippet}"`);
  });
})();
