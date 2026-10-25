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
      return filepath;
    }
  } catch (err) {
    console.error('Failed to save screenshot:', err.message);
  }
}

async function run() {
  console.log('=== Checking Verification Tab & Form Upload Status ===');

  // 1. Advance to Next Step (Attachment & Declaration / Verification)
  console.log('Advancing to Attachment & Declaration / Verification tab...');
  const nextRes = await post('/api/aoc4/next-step');
  console.log('Next Step Response:', nextRes.data?.message || nextRes.raw);
  if (nextRes.data?.modalText) {
    console.log('Modal Text on Screen:', nextRes.data.modalText);
  }

  // Save screenshot of the Verification / Attachment tab
  await saveScreenshot('verification_tab_live.png');

  // 2. Inspect DOM of current tab for upload and declaration status
  const domRes = await get('/api/aoc4/inspect-dom');
  const elements = domRes.data?.elements || [];
  console.log('Total DOM elements on current view:', elements.length);

  // Look for file upload inputs and their status
  const fileInputs = elements.filter(e => e.id && (e.id.includes('fileupload') || e.id.includes('file') || e.id.includes('upload')));
  console.log('\n--- File Attachment Fields & Status ---');
  if (fileInputs.length === 0) {
    console.log('No file upload fields found in current view.');
  } else {
    fileInputs.forEach((fi, idx) => {
      console.log(`${idx + 1}. [${fi.id}]`);
      console.log(`   Label/Row: ${fi.rowText || 'N/A'}`);
      console.log(`   Value/Selected: ${fi.value || 'None (No file uploaded)'}`);
    });
  }

  // Look for declaration fields
  const declFields = elements.filter(e => e.id && e.id.includes('1691095394'));
  console.log('\n--- Declaration & Verification Fields ---');
  declFields.forEach((df, idx) => {
    console.log(`${idx + 1}. [${df.id}] Tag: ${df.tag} | Value: "${df.value}" | Text: "${df.text}"`);
    console.log(`   Context: ${df.rowText?.substring(0, 100)}`);
  });

  // Check DSC upload field
  const dscFields = elements.filter(e => (e.rowText || '').toLowerCase().includes('dsc') || (e.id || '').toLowerCase().includes('custom_file_uplo'));
  console.log('\n--- DSC Upload Fields ---');
  dscFields.forEach(df => {
    console.log(`- [${df.id}] Value: "${df.value || 'None'}" | Row: ${df.rowText?.substring(0, 80)}`);
  });

  console.log('\n=== Inspection Complete ===');
}

run().catch(console.error);
