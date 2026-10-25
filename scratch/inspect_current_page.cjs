const http = require('http');
const fs = require('fs');
const path = require('path');

function get(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${endpoint}`, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch { resolve(b); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const domRes = await get('/api/aoc4/inspect-dom');
  const elements = domRes.elements || [];

  // Filter for visible or interesting elements
  console.log('Total DOM elements:', elements.length);

  // Check modals
  const modals = elements.filter(e => e.id && e.id.includes('modal'));
  console.log('Modal elements count:', modals.length);
  modals.forEach(m => {
    if (m.text || m.rowText) {
      console.log(`Modal: ${m.id} | text: ${m.text} | row: ${m.rowText?.substring(0, 100)}`);
    }
  });

  // Check verification & attachments
  const verifElements = elements.filter(e => 
    (e.id && (e.id.includes('1691095394') || e.id.includes('panel_1480276982') || e.id.includes('panel_200216998')))
  );
  console.log('\nVerification / Attachment / Submit elements count:', verifElements.length);
  verifElements.forEach(v => {
    console.log(`- [${v.id}] tag: ${v.tag}, type: ${v.type}, val: "${v.value}", text: "${v.text?.substring(0, 40)}"`);
  });

  // Check file upload inputs
  const fileInputs = elements.filter(e => e.id && (e.id.includes('fileupload') || e.id.includes('custom_file')));
  console.log('\nFile upload inputs found:', fileInputs.length);
  fileInputs.forEach((f, i) => {
    console.log(`${i+1}. [${f.id}] value: "${f.value || ''}" rowText: "${f.rowText?.substring(0, 80)}"`);
  });
}

main().catch(console.error);
