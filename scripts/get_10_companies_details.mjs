import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const sample = await client.query('SELECT * FROM warehouse.canonical_contractors LIMIT 1');
console.log('Contractor columns:', Object.keys(sample.rows[0]));

// 1. Query the 10 Competitor Companies from warehouse.canonical_contractors
const competitorPatterns = [
  { name: 'Empire Roofing, Inc.', pat: '%empire roof%' },
  { name: 'KPost Company', pat: '%kpost%' },
  { name: 'Lon Smith Roofing', pat: '%lon smith%' },
  { name: 'Supreme Roofing', pat: '%supreme roof%' },
  { name: 'Chamberlin Roofing & Waterproofing', pat: '%chamberlin%' },
  { name: 'Texas Roof Management (TRM)', pat: '%texas roof manag%' },
  { name: 'Parsons Commercial Roofing', pat: '%parsons%' },
  { name: 'Castro Roofing of Texas', pat: '%castro roof%' },
  { name: 'Tice Enterprises, LTD', pat: '%tice%' },
  { name: 'CentiMark Corporation', pat: '%centimark%' }
];

console.log('--- 1. TEN COMPETITOR ROOFING COMPANIES IN DB ---');
const competitors = [];
for (const c of competitorPatterns) {
  const res = await client.query(`
    SELECT *
    FROM warehouse.canonical_contractors
    WHERE canonical_name ILIKE $1
    LIMIT 2
  `, [c.pat]);
  competitors.push({ target: c.name, records: res.rows });
}
console.log(JSON.stringify(competitors, null, 2));

// 2. Query the 10 Property Owner Companies from warehouse.parcels & owner tables
const targetParcels = [
  { address: '1444 N Cockrell Hill Rd', pat: '%1444%COCKRELL%' },
  { address: '4040 Pipestone Rd', pat: '%4040%PIPESTONE%' },
  { address: '3737 Rock Quarry Rd', pat: '%3737%ROCK QUARRY%' },
  { address: '1251 N Cockrell Hill Rd', pat: '%1251%COCKRELL%' },
  { address: '3660 Pipestone Rd', pat: '%3660%PIPESTONE%' },
  { address: '3300 W Mockingbird Ln', pat: '%3300%MOCKINGBIRD%' },
  { address: '5200 Alpha Rd', pat: '%5200%ALPHA%' },
  { address: '4825 Cole Ave', pat: '%4825%COLE%' },
  { address: '1600 S Westmoreland Rd', pat: '%1600%WESTMORELAND%' },
  { address: '4038 Rock Quarry Rd', pat: '%4038%ROCK QUARRY%' }
];

console.log('--- 2. TEN ADJACENT BUILDING OWNER COMPANIES IN DB ---');
const owners = [];
for (const tp of targetParcels) {
  const pRes = await client.query(`
    SELECT 
      id, account_number, address, building_sqft, year_built, property_type,
      owner_name, owner_address, owner_city, owner_state, owner_zip, total_valuation
    FROM warehouse.parcels
    WHERE address ILIKE $1
    LIMIT 1
  `, [tp.pat]);
  owners.push({ targetAddress: tp.address, parcelData: pRes.rows[0] || null });
}
console.log(JSON.stringify(owners, null, 2));

await client.end();
