const http = require('http');

http.get('http://localhost:3001/api/aoc4/inspect-dom', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const json = JSON.parse(d);
    const btns = (json.elements || []).filter(e => e.tag === 'button' || e.type === 'submit' || e.type === 'button');
    console.log(`Total buttons found: ${btns.length}`);
    btns.forEach((b, idx) => {
      console.log(`[${idx+1}] ID: "${b.id}" | Text: "${b.text}" | Type: "${b.type}" | Row/Snippet: "${b.rowText?.substring(0, 50)}"`);
    });
  });
});
