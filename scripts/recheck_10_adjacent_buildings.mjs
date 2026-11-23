import pg from 'pg';
import dotenv from 'dotenv';
import https from 'https';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const targetBuildings = [
  { id: 1, address: '1444 N Cockrell Hill Rd', streetNumber: '1444', streetName: 'COCKRELL HILL', queryStr: '%1444%COCKRELL%' },
  { id: 2, address: '4040 Pipestone Rd', streetNumber: '4040', streetName: 'PIPESTONE', queryStr: '%4040%PIPESTONE%' },
  { id: 3, address: '3737 Rock Quarry Rd', streetNumber: '3737', streetName: 'ROCK QUARRY', queryStr: '%3737%ROCK QUARRY%' },
  { id: 4, address: '1251 N Cockrell Hill Rd', streetNumber: '1251', streetName: 'COCKRELL HILL', queryStr: '%1251%COCKRELL%' },
  { id: 5, address: '3660 Pipestone Rd', streetNumber: '3660', streetName: 'PIPESTONE', queryStr: '%3660%PIPESTONE%' },
  { id: 6, address: '3300 W Mockingbird Ln', streetNumber: '3300', streetName: 'MOCKINGBIRD', queryStr: '%3300%MOCKINGBIRD%' },
  { id: 7, address: '5200 Alpha Rd', streetNumber: '5200', streetName: 'ALPHA', queryStr: '%5200%ALPHA%' },
  { id: 8, address: '4825 Cole Ave', streetNumber: '4825', streetName: 'COLE', queryStr: '%4825%COLE%' },
  { id: 9, address: '1600 S Westmoreland Rd', streetNumber: '1600', streetName: 'WESTMORELAND', queryStr: '%1600%WESTMORELAND%' },
  { id: 10, address: '4400 Rock Quarry Rd', streetNumber: '4400', streetName: 'ROCK QUARRY', queryStr: '%4400%ROCK QUARRY%' },
];

function fetchSocrata(streetNumber, streetName) {
  return new Promise((resolve) => {
    // City of Dallas Building Permits on Socrata
    // Endpoint: 44v8-52ae
    const url = `https://www.dallasopendata.com/resource/44v8-52ae.json?$where=street_number='${streetNumber}' and upper(street_name) like '%25${encodeURIComponent(streetName)}%25'&$order=issue_date desc&$limit=20`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(Array.isArray(json) ? json : []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

console.log('--- RECHECKING 10 ADJACENT TARGET BUILDINGS ---');

const auditResults = [];

for (const b of targetBuildings) {
  // 1. Check local warehouse DB
  const dbPermits = await client.query(`
    SELECT raw_permit_number, issue_date, contractor_name, valuation, category, raw_description, probable_roof_system, is_pure_reroof
    FROM warehouse.normalized_permits
    WHERE normalized_address ILIKE $1
    ORDER BY issue_date DESC
  `, [b.queryStr]);

  // 2. Check live Socrata Dallas portal
  const socrataRecords = await fetchSocrata(b.streetNumber, b.streetName);

  // Filter for roof-specific permits
  const roofDbPermits = dbPermits.rows.filter(p => 
    (p.category && p.category.toLowerCase().includes('roof')) ||
    (p.raw_description && p.raw_description.toLowerCase().includes('roof')) ||
    (p.probable_roof_system && !p.probable_roof_system.toLowerCase().includes('unspecified')) ||
    p.is_pure_reroof === true
  );

  const roofSocrata = socrataRecords.filter(s => {
    const desc = (s.work_description || '').toLowerCase();
    const type = (s.permit_type || '').toLowerCase();
    return desc.includes('roof') || type.includes('roof');
  });

  auditResults.push({
    id: b.id,
    address: b.address,
    allDbPermitsCount: dbPermits.rows.length,
    roofDbPermitsCount: roofDbPermits.length,
    latestDbRoofPermit: roofDbPermits[0] || null,
    latestAnyDbPermit: dbPermits.rows[0] || null,
    socrataTotalRecords: socrataRecords.length,
    socrataRoofRecords: roofSocrata.length,
    latestSocrataRoof: roofSocrata[0] || null,
    latestAnySocrata: socrataRecords[0] || null
  });
}

console.log(JSON.stringify(auditResults, null, 2));

await client.end();
