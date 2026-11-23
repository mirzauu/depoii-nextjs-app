import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Inspect Supreme permits in detail
const permits = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%supreme%'
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 15;
`);
console.log('--- SUPREME PERMITS ---');
for (const p of permits.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} | Val: $${p.valuation} | System: ${p.probable_roof_system} | Name: ${p.contractor_name}`);
  console.log(`   Desc: ${p.raw_description}\n`);
}

// 2. Check around Stemmons Fwy jobs (2777 N Stemmons & 2949 N Stemmons)
const stemmons = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%stemmons%'
    AND (raw_description ILIKE '%roof%' OR raw_description ILIKE '%tpo%' OR raw_description ILIKE '%pvc%')
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- STEMMONS FWY ROOF PERMITS ---');
for (const r of stemmons.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

// 3. Check around 3020 W Wheatland Rd (Southwest Center / Wheatland corridor)
const wheatland = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%wheatland%'
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- WHEATLAND RD PERMITS ---');
for (const r of wheatland.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

await client.end();

