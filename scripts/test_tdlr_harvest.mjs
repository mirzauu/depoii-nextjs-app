import https from 'https';

// Test query TDLR open data API for Empire Roofing
// Texas Open Data (data.texas.gov) hosts TDLR Architectural Barriers projects
const tdlrUrl = "https://data.texas.gov/resource/ntbx-z767.json?$where=facility_name%20like%20'%25ROOF%25'%20or%20project_name%20like%20'%25EMPIRE%20ROOFING%25'&$limit=10";

console.log('Querying Texas Open Data TDLR endpoint...');
https.get(tdlrUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('TDLR Response status:', res.statusCode);
      console.log('Sample rows:', parsed.slice(0, 3));
    } catch (e) {
      console.log('Raw TDLR data preview:', data.slice(0, 300));
    }
  });
}).on('error', err => console.error('TDLR error:', err));

