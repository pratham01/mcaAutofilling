const http = require('http');

http.get('http://localhost:3001/api/aoc4/inspect-dom', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(d);
      const elems = (json.elements || []).filter(e => {
        const s = (e.id + ' ' + e.name + ' ' + e.rowText).toLowerCase();
        return s.includes('panel1aoc4') || s.includes('corporate') || s.includes('meeting') || s.includes('agm') || s.includes('financial year') || s.includes('member');
      });
      console.log('Total Section 1 elements found:', elems.length);
      elems.forEach((e, idx) => {
        console.log(`[${idx+1}] <${e.tag}> id="${e.id}" type="${e.type}" val="${e.value}" text="${e.text}" placeholder="${e.placeholder}"`);
        console.log(`     row="${e.rowText.substring(0, 80)}"`);
      });
    } catch (err) {
      console.error(err);
    }
  });
}).on('error', console.error);
