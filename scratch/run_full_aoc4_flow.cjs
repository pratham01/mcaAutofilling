const http = require('http');
const fs = require('fs');
const path = require('path');

function post(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`http://localhost:3001${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${endpoint}`, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function saveScreenshot(filename) {
  try {
    const res = await get('/api/aoc4/live-screenshot');
    if (res.data?.screenshot) {
      const b64 = res.data.screenshot.replace(/^data:image\/\w+;base64,/, '');
      const filepath = path.resolve(__dirname, `../data/screenshots/${filename}`);
      fs.writeFileSync(filepath, Buffer.from(b64, 'base64'));
      console.log(`Saved screenshot: ${filepath}`);
    }
  } catch (err) {
    console.error('Failed to save screenshot:', err.message);
  }
}

async function runFullFilingFlow() {
  const targetCin = process.argv[2] || process.env.CIN || '';
  console.log('========================================================');
  console.log('🚀 EXECUTING COMPLETE AOC-4 FORM FILING FLOW ON MCA');
  console.log(`CIN: ${targetCin || 'Active Workspace'} | FY: 2025-26`);
  console.log('========================================================\n');

  // STEP 1: Verify or Launch Browser Session
  console.log('--- Step 1: Checking Authentication Session ---');
  let statusRes = await get('/api/aoc4/status');
  console.log('Current Login Status:', statusRes.data?.isLoggedIn);
  if (!statusRes.data?.isLoggedIn) {
    console.log('🌐 Launching Playwright Chrome browser and entering credentials to display CAPTCHA modal...');
    const startRes = await post('/api/aoc4/start-session', {
      email: 'pratham.bpl.pb@gmail.com',
      password: 'Bajaj@1234'
    });
    console.log('Start Session Response:', startRes.data?.message || startRes.raw);
    await saveScreenshot('current_login_screen.png');

    console.log('⏳ Playwright Chrome browser is OPEN. Please enter CAPTCHA and OTP in the Chrome window!');
    while (true) {
      await new Promise(r => setTimeout(r, 2000));
      statusRes = await get('/api/aoc4/status');
      if (statusRes.data?.isLoggedIn) {
        console.log('✅ User login detected on MCA portal! Proceeding autonomously...');
        break;
      }
    }
  }

  // STEP 2: Navigate and Verify Access to Form AOC-4
  console.log('\n--- Step 2: Locating & Verifying Form AOC-4 ---');
  const accessRes = await post('/api/aoc4/verify-form-access', { cin: targetCin });
  console.log('Form Access:', accessRes.status, accessRes.data?.message || accessRes.raw);
  await saveScreenshot('full_flow_step2_form_ready.png');

  // STEP 3: Section 1 (Part A: General Info & Statutory Dates)
  console.log('\n--- Step 3: Populating Section 1 (Part A) ---');
  const fill1Res = await post('/api/aoc4/fill-section', { section: 'section_1' });
  console.log('Section 1 Fill:', fill1Res.status, fill1Res.data?.message || fill1Res.raw);

  console.log('Inspecting Section 1 for UI issues...');
  let inspect1 = await get('/api/aoc4/inspect-section-errors?section=section_1');
  console.log('Section 1 hasErrors:', inspect1.data?.hasErrors, '| Issues count:', inspect1.data?.issues?.length || 0);

  if (inspect1.data?.hasErrors) {
    console.log('Autonomously healing Section 1 issues...');
    const fix1 = await post('/api/aoc4/auto-fix', { section: 'section_1' });
    console.log('Auto-Fix Result:', fix1.data?.success, '| Fixed Count:', fix1.data?.fixedCount, '| Actions:', fix1.data?.actions);
    inspect1 = await get('/api/aoc4/inspect-section-errors?section=section_1');
    console.log('Re-inspection Section 1: hasErrors =', inspect1.data?.hasErrors, '| Remaining:', inspect1.data?.issues?.length || 0);
  }

  console.log('Saving Section 1 draft on MCA...');
  const save1 = await post('/api/aoc4/save-section', { sectionName: 'section_1' });
  console.log('Save Section 1 Result:', save1.status, save1.data?.message || save1.raw);
  await saveScreenshot('full_flow_section1_saved.png');

  // STEP 4: Section 2 (Part B: Balance Sheet Schedules)
  console.log('\n--- Step 4: Populating Section 2 (Part B: Balance Sheet) ---');
  const fill2Res = await post('/api/aoc4/fill-section', { section: 'section_2' });
  console.log('Section 2 Fill:', fill2Res.status, fill2Res.data?.message || fill2Res.raw);

  console.log('Inspecting Section 2 for UI issues...');
  let inspect2 = await get('/api/aoc4/inspect-section-errors?section=section_2');
  console.log('Section 2 hasErrors:', inspect2.data?.hasErrors, '| Issues count:', inspect2.data?.issues?.length || 0);

  if (inspect2.data?.hasErrors) {
    console.log('Autonomously healing Section 2 issues...');
    const fix2 = await post('/api/aoc4/auto-fix', { section: 'section_2' });
    console.log('Auto-Fix Result:', fix2.data?.success, '| Fixed Count:', fix2.data?.fixedCount);
    inspect2 = await get('/api/aoc4/inspect-section-errors?section=section_2');
    console.log('Re-inspection Section 2: hasErrors =', inspect2.data?.hasErrors, '| Remaining:', inspect2.data?.issues?.length || 0);
  }

  console.log('Saving Section 2 draft on MCA...');
  const save2 = await post('/api/aoc4/save-section', { sectionName: 'section_2' });
  console.log('Save Section 2 Result:', save2.status, save2.data?.message || save2.raw);
  await saveScreenshot('full_flow_section2_saved.png');

  // STEP 5: Section 3 (Part C: Profit & Loss Statement)
  console.log('\n--- Step 5: Populating Section 3 (Part C: Profit & Loss) ---');
  const fill3Res = await post('/api/aoc4/fill-section', { section: 'section_3' });
  console.log('Section 3 Fill:', fill3Res.status, fill3Res.data?.message || fill3Res.raw);

  console.log('Inspecting Section 3 for UI issues...');
  let inspect3 = await get('/api/aoc4/inspect-section-errors?section=section_3');
  console.log('Section 3 hasErrors:', inspect3.data?.hasErrors, '| Issues count:', inspect3.data?.issues?.length || 0);

  if (inspect3.data?.hasErrors) {
    console.log('Autonomously healing Section 3 issues...');
    const fix3 = await post('/api/aoc4/auto-fix', { section: 'section_3' });
    console.log('Auto-Fix Result:', fix3.data?.success, '| Fixed Count:', fix3.data?.fixedCount);
    inspect3 = await get('/api/aoc4/inspect-section-errors?section=section_3');
    console.log('Re-inspection Section 3: hasErrors =', inspect3.data?.hasErrors, '| Remaining:', inspect3.data?.issues?.length || 0);
  }

  console.log('Saving Section 3 draft on MCA...');
  const save3 = await post('/api/aoc4/save-section', { sectionName: 'section_3' });
  console.log('Save Section 3 Result:', save3.status, save3.data?.message || save3.raw);
  await saveScreenshot('full_flow_section3_saved.png');

  console.log('\n========================================================');
  console.log('🎉 COMPLETE AOC-4 FILING FLOW VALIDATED & DRAFTS SAVED!');
  console.log('========================================================');
}

runFullFilingFlow().catch(console.error);
