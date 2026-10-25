const http = require('http');

http.get('http://localhost:3001/api/aoc4/inspect-dom', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(d);
      const elems = json.elements || [];
      const saves = elems.filter(e => (e.text || '').toLowerCase().includes('save') || (e.value || '').toLowerCase().includes('save'));
      console.log('Total Save elements found on page:', saves.length);
      saves.forEach((s, idx) => {
        console.log(`[${idx+1}] <${s.tag} id="${s.id}" type="${s.type}"> text="${s.text}" row="${s.rowText?.substring(0, 80)}"`);
      });
    } catch(err) {
      console.error(err);
    }
  });
}).on('error', console.error);
