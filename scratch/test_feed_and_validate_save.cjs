const http = require('http');
const fs = require('fs');

const post = (urlPath, body) => new Promise((resolve, reject) => {
  const data = JSON.stringify(body || {});
  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: urlPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try { resolve(JSON.parse(d)); } catch (e) { resolve({ raw: d }); }
    });
  });
  req.on('error', reject);
  req.write(data);
  req.end();
});

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
  console.log('================================================================');
  console.log('STEP 1: POPULATE SECTION 1 (PART A)');
  console.log('================================================================');
  const fillRes = await post('/api/aoc4/fill-section', { section: 'section_1' });
  console.log('Fill Result:');
  console.log(`- filledCount: ${fillRes.filledCount}`);
  console.log(`- errors count: ${fillRes.errors?.length || 0}`);
  if (fillRes.errors && fillRes.errors.length > 0) {
    console.log('Errors:', fillRes.errors);
  }
  console.log('Details populated (first 10):', (fillRes.details || []).slice(0, 10));

  console.log('\n================================================================');
  console.log('STEP 2: INSPECT DOM ELEMENTS AFTER POPULATION');
  console.log('================================================================');
  const domRes = await get('/api/aoc4/inspect-dom');
  const elements = domRes.elements || [];
  
  // Key Section 1 Fields to verify
  const keyFieldsToCheck = [
    { name: '1(a) CIN Input', test: id => id.includes('panel1aoc4') && id.includes('guidetextbox') && !id.includes('copy') },
    { name: '2(a) Company Name', test: id => id.includes('panel_478261092-panel_252196987-guidetextbox_copy___widget') },
    { name: '2(b) Address', test: id => id.includes('panel_478261092-panel_252196987-guidetextbox_copy_673278796___widget') },
    { name: '2(c) Email', test: id => id.includes('panel_478261092-panel_252196987-guidetextbox_copy_375806483___widget') },
    { name: '3 FY From', test: id => id.includes('panel_478261092_copy-panel_252196987-guidetextbox_copy___widget') },
    { name: '3 FY To', test: id => id.includes('panel_478261092_copy-panel_252196987-guidetextbox_copy_673278796___widget') },
    { name: '4(a) BM Date', test: id => id.includes('panel_2074267803-panel_478261092_copy_1688980105-guidetextbox_copy_co___widget') },
    { name: '4(b) Nature of FS', test: id => id.includes('panel_2074267803-panel_478261092_copy_1688980105-panel_252196987-guidetextbox_copy___widget') },
    { name: '6 Auditor Report Date', test: id => id.includes('guidedatepicker_423285079___widget') },
    { name: '7(a) AGM Held (Radio 1: Yes)', test: id => id.includes('cop_606137638-panel_478261092_copy-guideradiobutton__-1_widget') },
    { name: '7(a) AGM Held (Radio 2: No)', test: id => id.includes('cop_606137638-panel_478261092_copy-guideradiobutton__-2_widget') },
    { name: '7(b) Date of AGM', test: id => id.includes('cop_606137638-panel_478261092_copy-guidetextbox_copy_co___widget') },
    { name: '7(c) Due date of AGM', test: id => id.includes('cop_606137638-panel_478261092_copy-guidetextbox_copy_co_87220494___widget') },
    { name: '7(d) Extension Radio (Yes)', test: id => id.includes('cop_606137638-panel_478261092_copy-guideradiobutton_cop__-1_widget') },
    { name: '7(d) Extension Radio (No)', test: id => id.includes('cop_606137638-panel_478261092_copy-guideradiobutton_cop__-2_widget') },
    { name: '7(d) Extension Details', test: id => id.includes('cop_606137638-panel_478261092_copy-guidetextbox_copy_co_471138715___widget') },
    { name: '7(e) Extended AGM Date', test: id => id.includes('cop_606137638-panel_478261092_copy-guidetextbox_copy_co_883381637___widget') },
  ];

  console.log('\n--- FIELD AUDIT TABLE ---');
  for (const kf of keyFieldsToCheck) {
    const match = elements.find(e => kf.test((e.id || '').toLowerCase()));
    if (match) {
      const isOk = (match.value && match.value.trim().length > 0) || match.value === 'on';
      console.log(`[${isOk ? 'OK' : 'MISSING'}] ${kf.name}`);
      console.log(`       ID: "${match.id}"`);
      console.log(`       Type: <${match.tag} type="${match.type}"> Value: "${match.value}" Placeholder: "${match.placeholder}"`);
    } else {
      console.log(`[NOT FOUND] ${kf.name}`);
    }
  }

  console.log('\n================================================================');
  console.log('STEP 3: CAPTURE SCREENSHOT OF FIRST SECTION ON AOC 4');
  console.log('================================================================');
  const ssRes = await get('/api/aoc4/live-screenshot');
  if (ssRes.screenshot) {
    const b64 = ssRes.screenshot.replace(/^data:image\/\w+;base64,/, '');
    const outPath = 'scratch/aoc4_section1_inspected.png';
    fs.writeFileSync(outPath, b64, 'base64');
    console.log(`Screenshot saved to: ${outPath} (${Buffer.byteLength(b64, 'base64')} bytes)`);
  }

  console.log('\n================================================================');
  console.log('STEP 4: CLICK SAVE BUTTON AND VALIDATE POST-CLICK MESSAGE');
  console.log('================================================================');
  const saveRes = await post('/api/aoc4/save-section', { sectionName: 'Section 1 (Part A)' });
  console.log('Save API Result:');
  console.log(`- Success: ${saveRes.success}`);
  console.log(`- Confirmed by MCA: ${saveRes.confirmed}`);
  console.log(`- Message: ${saveRes.message}`);
  if (saveRes.issues && saveRes.issues.length > 0) {
    console.log('- Issues detected:', saveRes.issues);
  }

  console.log('\n================================================================');
  console.log('STEP 5: VALIDATE ANY MESSAGE / POPUP / VALIDATION ERRORS APPEARING');
  console.log('================================================================');
  const errRes = await get('/api/aoc4/inspect-section-errors?section=section_1');
  console.log(`Has Errors: ${errRes.hasErrors}`);
  console.log(`Total Issues: ${errRes.issues?.length || 0}`);
  if (errRes.issues) {
    errRes.issues.forEach((iss, i) => {
      console.log(`  [Issue ${i+1}] Type: ${iss.type} | Label: "${iss.label}" | Error: "${iss.error}"`);
    });
  }

  const postSs = await get('/api/aoc4/live-screenshot');
  if (postSs.screenshot) {
    const b64 = postSs.screenshot.replace(/^data:image\/\w+;base64,/, '');
    const outPath = 'scratch/aoc4_after_save_modal.png';
    fs.writeFileSync(outPath, b64, 'base64');
    console.log(`Post-save screenshot saved to: ${outPath}`);
  }
})();
