import https from 'https';

// 1. Check City of Dallas Open Data (Socrata API) for any additional Empire Roofing records
const socrataUrl = "https://www.dallasopendata.com/resource/44v8-52ae.json?$select=count(*)&$where=contractor_name like '%25EMPIRE%25'";

https.get(socrataUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Dallas Socrata Count for EMPIRE:', data);
  });
}).on('error', err => console.error('Socrata error:', err));

