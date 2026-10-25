(async () => {
  const res = await fetch('http://localhost:3001/api/aoc4/status');
  const d = await res.json();
  console.log('Session status:', d.session?.stage);

  // We can ask the server to take screenshots of the elements
  const shotRes = await fetch('http://localhost:3001/api/aoc4/inspect-screenshot');
  const shotData = await shotRes.json();
  console.log('Inspection result:', shotData);
})();
