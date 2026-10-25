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
  console.log('Fetching detailed Section 1 inspection...');
  const res = await get('/api/aoc4/inspect-section1-detailed');
  if (res.error) {
    console.error('Error:', res.error);
    return;
  }

  console.log(`\n=================== SECTION 1 FORM FIELDS (${res.sectionFields?.length || 0}) ===================`);
  res.sectionFields?.forEach((f, idx) => {
    const status = f.hasError ? '❌ ERROR: ' + f.errorMessage : '✅ OK';
    const checked = f.checked !== null ? ` [checked=${f.checked}]` : '';
    const readOnly = f.readOnly ? ' [readonly]' : '';
    const disabled = f.disabled ? ' [disabled]' : '';
    console.log(`\n[Field #${idx + 1}] Q: "${f.questionTitle}"`);
    console.log(`  Label:       "${f.label}"`);
    console.log(`  Tag/Type:    <${f.tag} type="${f.type}"> ID: "${f.id}"`);
    console.log(`  Value:       "${f.value}"${checked}${readOnly}${disabled} (Placeholder: "${f.placeholder}")`);
    console.log(`  Validation:  ${status}`);
    if (f.options) console.log(`  Options:     ${f.options.slice(0, 5).join(' | ')}`);
  });

  console.log(`\n=================== ACTION BUTTONS (${res.actionButtons?.length || 0}) ===================`);
  res.actionButtons?.forEach((b, idx) => {
    console.log(`[Button #${idx + 1}] Text: "${b.text}" | Tag: <${b.tag}> | ID: "${b.id}" | Visible: ${b.visible} | Disabled: ${b.disabled} | Panel: "${b.parentPanel}"`);
  });

  // Save JSON report to scratch
  fs.writeFileSync('scratch/section1_inspection_report.json', JSON.stringify(res, null, 2));
  console.log('\nWrote full report to scratch/section1_inspection_report.json');
})();
