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
  console.log('======================================================================');
  console.log('STEP 1: FILL MANDATORY FIELDS IN SEGMENT I: PART A (GENERAL INFO)');
  console.log('======================================================================');

  const fillRes = await post('/api/aoc4/fill-section', { section: 'section_1' });
  console.log(`Fill executed. Filled count: ${fillRes.filledCount}`);
  if (fillRes.errors && fillRes.errors.length > 0) {
    console.log('Fill warnings/errors:', fillRes.errors);
  }
  console.log('Populated fields sample:', (fillRes.details || []).slice(0, 12));

  console.log('\n======================================================================');
  console.log('STEP 2: READBACK AUDIT OF ALL MANDATORY FIELDS IN PART A');
  console.log('======================================================================');
  const domRes = await get('/api/aoc4/inspect-dom');
  const elements = domRes.elements || [];

  const mandatoryPartA = [
    { label: '1(a) CIN', pattern: /panel1aoc4.*guidetextbox.*widget/i },
    { label: '1(c) Number of Members', pattern: /member/i },
    { label: '2(a) Company Name', pattern: /panel_478261092.*guidetextbox_copy___widget/i },
    { label: '2(b) Address', pattern: /panel_478261092.*guidetextbox_copy_673278796___widget/i },
    { label: '2(c) Email', pattern: /panel_478261092.*guidetextbox_copy_375806483___widget/i },
    { label: '3 Financial Year From', pattern: /panel_478261092_copy.*guidetextbox_copy___widget/i },
    { label: '3 Financial Year To', pattern: /panel_478261092_copy.*guidetextbox_copy_673278796___widget/i },
    { label: '4(a) Board Meeting Date', pattern: /panel_2074267803.*1688980105-guidetextbox_copy_co___widget/i },
    { label: '4(b) Nature of Financial Statements', pattern: /panel_2074267803.*1688980105.*guidetextbox_copy___widget/i },
    { label: '6 Auditor Report Date', pattern: /guidedatepicker_423285079___widget/i },
    { label: '7(a) AGM Held: Yes', pattern: /cop_606137638.*guideradiobutton__-1_widget/i },
    { label: '7(b) Actual Date of AGM', pattern: /cop_606137638.*guidetextbox_copy_co___widget/i },
    { label: '7(c) Due Date of AGM', pattern: /cop_606137638.*guidetextbox_copy_co_87220494___widget/i },
    { label: '7(d) Extension for AGM: No', pattern: /cop_606137638.*guideradiobutton_cop__-2_widget/i },
  ];

  mandatoryPartA.forEach(item => {
    const el = elements.find(e => item.pattern.test(e.id || ''));
    if (el) {
      const val = el.value || el.text;
      const isOk = val && val.trim().length > 0;
      console.log(`[${isOk ? '✅ POPULATED' : '⚠️ EMPTY'}] ${item.label}`);
      console.log(`      ID: "${el.id}"`);
      console.log(`      Value: "${val}" (Placeholder: "${el.placeholder}")`);
    } else {
      console.log(`[❓ NOT FOUND IN DOM] ${item.label}`);
    }
  });

  console.log('\n======================================================================');
  console.log('STEP 3: CAPTURE SCREENSHOT OF PART A');
  console.log('======================================================================');
  const ssRes = await get('/api/aoc4/live-screenshot');
  if (ssRes.screenshot) {
    const b64 = ssRes.screenshot.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync('scratch/part_a_filled_screenshot.png', b64, 'base64');
    console.log('Saved Part A screenshot to: scratch/part_a_filled_screenshot.png');
  }

  console.log('\n======================================================================');
  console.log('STEP 4: TRIGGER SAVE FORM AND VALIDATE ERRORS');
  console.log('======================================================================');
  const saveRes = await post('/api/aoc4/save-section', { sectionName: 'Section 1 (Part A)' });
  console.log('Save Result:');
  console.log(`- Success: ${saveRes.success}`);
  console.log(`- Confirmed by MCA: ${saveRes.confirmed}`);
  console.log(`- Message: ${saveRes.message}`);

  console.log('\n======================================================================');
  console.log('STEP 5: HIGHLIGHT ALL DETECTED ERRORS & ALERTS');
  console.log('======================================================================');
  const errRes = await get('/api/aoc4/inspect-section-errors?section=section_1');
  console.log(`Has Errors: ${errRes.hasErrors}`);
  console.log(`Total Issues Detected: ${errRes.issues?.length || 0}`);
  if (errRes.issues && errRes.issues.length > 0) {
    errRes.issues.forEach((iss, idx) => {
      console.log(`\n❌ [ERROR #${idx + 1}] Type: ${iss.type}`);
      console.log(`   Label: "${iss.label}"`);
      console.log(`   Message: "${iss.error}"`);
      if (iss.fieldId) console.log(`   Field ID: "${iss.fieldId}"`);
    });
  } else {
    console.log('🎉 No errors or validation warnings detected on the form!');
  }

  const postSs = await get('/api/aoc4/live-screenshot');
  if (postSs.screenshot) {
    const b64 = postSs.screenshot.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync('scratch/part_a_post_save_screenshot.png', b64, 'base64');
    console.log('\nSaved post-save screenshot to: scratch/part_a_post_save_screenshot.png');
  }
})();
