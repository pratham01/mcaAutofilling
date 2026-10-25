const http = require('http');

http.get('http://localhost:3001/api/aoc4/inspect-dom', res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const data = JSON.parse(b);
    const elements = data.elements || [];

    const vPanel = elements.filter(e => e.id && (e.id.includes('1691095394') || e.id.includes('985107667')));
    console.log('=== Panel 1691095394 Elements ===');
    vPanel.forEach((e, i) => {
      console.log(`[${i+1}] ID: ${e.id}`);
      console.log(`    Tag: ${e.tag} | Type: ${e.type} | Value: "${e.value}"`);
      console.log(`    Text: "${e.text?.trim().substring(0, 100)}"`);
      console.log(`    RowContext: "${e.rowText?.trim().substring(0, 150)}"`);
    });

    const submitPanel = elements.filter(e => e.id && e.id.includes('200216998_copy'));
    console.log('\n=== Panel 200216998_copy (Review & Submit) Elements ===');
    submitPanel.forEach((e, i) => {
      console.log(`[${i+1}] ID: ${e.id}`);
      console.log(`    Tag: ${e.tag} | Type: ${e.type} | Value: "${e.value}"`);
      console.log(`    Text: "${e.text?.trim().substring(0, 100)}"`);
      console.log(`    RowContext: "${e.rowText?.trim().substring(0, 150)}"`);
    });
  });
});
