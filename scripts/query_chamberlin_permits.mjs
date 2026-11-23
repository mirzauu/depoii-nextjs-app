import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check contractor_id = 'CTR-CHAMBERLIN-ROOFING'
const res1 = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_id = 'CTR-CHAMBERLIN-ROOFING'
  LIMIT 15;
`);
console.log('--- BY CONTRACTOR_ID ---', res1.rows.length);
for (const p of res1.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} | Val: $${p.valuation} | Name: ${p.contractor_name}`);
}

// 2. Also search contractor_name ILIKE '%chamber%'
const res2 = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%chamber%'
  LIMIT 15;
`);
console.log('--- BY CONTRACTOR_NAME ILIKE %chamber% ---', res2.rows.length);
for (const p of res2.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} | Val: $${p.valuation} | Name: ${p.contractor_name}`);
}

// 3. Search raw_description ILIKE '%chamberlin%'
const res3 = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE raw_description ILIKE '%chamberlin%'
  LIMIT 15;
`);
console.log('--- BY DESCRIPTION ILIKE %chamberlin% ---', res3.rows.length);
for (const p of res3.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} | Val: $${p.valuation} | Name: ${p.contractor_name}`);
  console.log(`   Desc: ${p.raw_description}\n`);
}

await client.end();

