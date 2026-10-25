const http = require('http');

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

async function runFlow() {
  console.log('=== STEP 1: Launch Browser & Restore Authenticated MCA Session ===');
  const sessionRes = await post('/api/aoc4/start-session', { email: 'pratham.bpl.pb@gmail.com', password: 'dummy' });
  console.log('Session Status:', sessionRes.status, sessionRes.data?.message || sessionRes.raw);

  const targetCin = process.argv[2] || process.env.CIN || '';
  console.log(`\n=== STEP 2: Verify Access to Form AOC-4 for CIN ${targetCin} ===`);
  const accessRes = await post('/api/aoc4/verify-form-access', { cin: targetCin });
  console.log('Access Status:', accessRes.status, accessRes.data?.message || accessRes.raw);

  console.log('\n=== STEP 3: Populate Section 1 (Part A: General Information & Compliance) ===');
  const fillRes = await post('/api/aoc4/fill-section', { section: 'section_1' });
  console.log('Fill Status:', fillRes.status, fillRes.data?.message || fillRes.raw);

  console.log('\n=== STEP 4: Inspect Section 1 for UI Validation Issues (Red Borders) ===');
  const inspectRes = await get('/api/aoc4/inspect-section-errors?section=section_1');
  console.log('Inspect Section 1: hasErrors =', inspectRes.data?.hasErrors, '| Issues count =', inspectRes.data?.issues?.length || 0);
  if (inspectRes.data?.issues?.length > 0) {
    console.log('Detected Issues:', JSON.stringify(inspectRes.data.issues, null, 2));
    
    console.log('\n=== STEP 5: Trigger Autonomous Self-Healing Auto-Fix ===');
    const fixRes = await post('/api/aoc4/auto-fix', { section: 'section_1' });
    console.log('Auto-Fix Result: Success =', fixRes.data?.success, '| Fixed Count =', fixRes.data?.fixedCount);
    console.log('Actions Taken:', fixRes.data?.actions);
    console.log('Remaining Issues:', fixRes.data?.remainingIssues?.length || 0);

    const reInspect = await get('/api/aoc4/inspect-section-errors?section=section_1');
    console.log('Re-inspection after Auto-Fix: hasErrors =', reInspect.data?.hasErrors, '| Issues count =', reInspect.data?.issues?.length || 0);
  } else {
    console.log('Section 1 is completely clean! Zero validation errors detected.');
  }

  console.log('\n=== STEP 6: Save Section 1 Draft on MCA Portal ===');
  const saveRes = await post('/api/aoc4/save-section', { sectionName: 'section_1' });
  console.log('Save Draft Result:', saveRes.status, saveRes.data?.message || saveRes.raw);

  console.log('\n=== COMPLETE TEST FLOW EXECUTION FINISHED ===');
}

runFlow().catch(console.error);
