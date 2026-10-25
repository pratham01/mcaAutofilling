const http = require('http');

function post(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`http://localhost:3001${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, raw: body }); }
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
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, raw: body }); }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- Step 1: Auto-Fixing Section 1 & Section 2 (Auditor) ---');
  const fixRes = await post('/api/aoc4/auto-fix', { section: 'section_1' });
  console.log('Fix Res:', fixRes.data?.success, '| Fixed Count:', fixRes.data?.fixedCount);

  const inspect1 = await get('/api/aoc4/inspect-section-errors?section=section_1');
  console.log('Inspect Section 1 remaining issues:', inspect1.data?.issues?.length);
  if (inspect1.data?.issues?.length > 0) {
    inspect1.data.issues.forEach(i => console.log('Remaining:', i.fieldId, '|', i.label, '|', i.error));
  }
}

run().catch(console.error);
