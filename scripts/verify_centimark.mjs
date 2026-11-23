import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check all CentiMark permits in DFW
const permits = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%centimark%'
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 20;
`);

console.log('--- CENTIMARK PERMITS ---');
for (const p of permits.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} (${p.city}, ${p.zip_code}) | Val: $${p.valuation} | System: ${p.probable_roof_system} | Name: ${p.contractor_name}`);
  console.log(`   Desc: ${p.raw_description}\n`);
}

// 2. Also check Harry Hines Blvd around 10429 Harry Hines Blvd
const hines = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%harry hines%'
    AND (raw_description ILIKE '%roof%' OR raw_description ILIKE '%tpo%' OR raw_description ILIKE '%metal%')
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- HARRY HINES ROOF PERMITS ---');
for (const r of hines.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

// 3. Check Valley View Ln Irving (around CentiMark DFW Branch at 2400 Valley View Ln)
const valleyView = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%valley view ln%'
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- VALLEY VIEW LN PERMITS ---', valleyView.rows.length);

await client.end();

