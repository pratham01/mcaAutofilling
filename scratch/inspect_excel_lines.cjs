const xlsx = require('xlsx');
const wb = xlsx.readFile('D:/SONAL_WORK_BACKUP/SONAL_WORK_BACKUP/CA SANDIP SARDA/ANNUAL FILING/2026-27/GURPREET SALUJA/GurpreetSaluja_Financials_2025-26.xls');

console.log('=== BALANCE SHEET LINE ITEMS ===');
const bs = wb.Sheets['Balance Sheet'];
const bsRows = xlsx.utils.sheet_to_json(bs, { header: 1 });
bsRows.forEach((r, idx) => {
  if (r && (r[1] || r[3])) {
    const item = r[1] || r[3];
    const cur = r[5];
    const prev = r[6];
    if (cur !== undefined || prev !== undefined) {
      console.log(`[Line ${idx}] ${String(item).trim()}: Current = ${cur}, Previous = ${prev}`);
    }
  }
});

console.log('\n=== PROFIT & LOSS LINE ITEMS ===');
const pl = wb.Sheets['Profit and Loss'];
const plRows = xlsx.utils.sheet_to_json(pl, { header: 1 });
plRows.forEach((r, idx) => {
  if (r && (r[1] || r[3])) {
    const item = r[1] || r[3];
    const cur = r[5];
    const prev = r[6];
    if (cur !== undefined || prev !== undefined) {
      console.log(`[Line ${idx}] ${String(item).trim()}: Current = ${cur}, Previous = ${prev}`);
    }
  }
});
