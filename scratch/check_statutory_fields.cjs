const http = require('http');

const req = http.request('http://localhost:3001/api/aoc4/inspect-dom', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const els = json.elements || [];

      const targets = [
        { key: 'shareCapital', match: '1643805949299' },
        { key: 'reserves', match: '1643810517445' },
        { key: 'ltBorrowings', match: '1643811210419' },
        { key: 'tradePayables', match: '1720503320436' },
        { key: 'otherCurrLiab', match: '1643867870856' },
        { key: 'ppeTangible', match: '1643869054338' },
        { key: 'tradeReceivables', match: '1643869691136' },
        { key: 'cashEq', match: '1643869700100' },
        { key: 'revenue', match: '1644085541251' },
        { key: 'employeeBenefits', match: '1644088984594' },
        { key: 'depreciation', match: '1644089025199' },
        { key: 'otherExpenses', match: '1644089032941' },
      ];

      console.log('--- STATUTORY SCHEDULE FIELD VERIFICATION ---');
      targets.forEach(t => {
        const found = els.find(e => e.id && e.id.includes(t.match));
        if (found) {
          console.log(`[${t.key}] -> Value: "${found.value}" (ID: ...${found.id.slice(-35)})`);
        } else {
          console.log(`[${t.key}] -> NOT FOUND by match: ${t.match}`);
        }
      });
    } catch (err) {
      console.error('Error:', err.message);
    }
  });
});
req.on('error', err => console.error(err.message));
req.end();
