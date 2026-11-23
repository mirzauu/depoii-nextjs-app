import https from 'https';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Check the exact 48 permits in warehouse.normalized_permits that belong to Dallas
const dbDallasPermits = await client.query(`
  SELECT raw_permit_number, normalized_address, category, valuation, is_pure_reroof
  FROM warehouse.normalized_permits
  WHERE (contractor_name ILIKE '%empire roofing%' OR contractor_id IN (SELECT id FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%empire roofing%'))
    AND jurisdiction ILIKE '%Dallas%'
`);

const dbPermitNumbers = new Set(dbDallasPermits.rows.map(r => r.raw_permit_number.trim()));

// Fetch all 60 from Socrata to see which 12 are different
const url = "https://www.dallasopendata.com/resource/e7gq-4sah.json?$where=contractor%20like%20'%25EMPIRE%20ROOFING%25'&$limit=100";

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const socrataList = JSON.parse(data);
    
    console.log('--- THE 12 SOCRATA PERMITS NOT MATCHING THE 48 MAIN ROWS ---');
    const notIn48 = socrataList.filter(s => !dbPermitNumbers.has(s.permit_number.trim()));
    console.log(`Count of Socrata permits not in DB 48: ${notIn48.length}`);
    for (const p of notIn48) {
      console.log(`- [${p.permit_number}] ${p.street_address} | Type: ${p.permit_type} | Val: $${p.value} | Desc: ${p.work_description}`);
    }
    
    await client.end();
  });
}).on('error', console.error);

