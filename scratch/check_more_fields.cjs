const http = require('http');

const req = http.request('http://localhost:3001/api/aoc4/inspect-dom', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const els = json.elements || [];

      const targets = [
        { key: 'shareCapitalPrev', match: '1643805949300' },
        { key: 'reservesPrev', match: '1643810517446' },
        { key: 'ltBorrowingsPrev', match: '1643811210420' },
        { key: 'defTaxLiabPrev', match: '1643811216489' },
        { key: 'tradePayablesPrev', match: '1720503320437' },
        { key: 'shortTermProvCur', match: '1643867878144' },
        { key: 'shortTermProvPrev', match: '1643867878145' },
        { key: 'ppeTangiblePrev', match: '1643869054339' },
        { key: 'defTaxAssetCur', match: '1643869089145' },
        { key: 'tradeReceivablesPrev', match: '1643869691137' },
        { key: 'cashEqPrev', match: '1643869700101' },
        { key: 'otherIncomeCur', match: '1644086710222' },
        { key: 'deferredTaxCur', match: '1644091660696' },
      ];

      console.log('--- ADDITIONAL STATUTORY VALUES VERIFICATION ---');
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
