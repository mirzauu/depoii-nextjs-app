import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Inspect Castro permits in detail
const permits = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%castro roofing%'
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 15;
`);

console.log('--- CASTRO ROOFING PERMITS ---');
for (const p of permits.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} (${p.city}, ${p.zip_code}) | Val: $${p.valuation} | System: ${p.probable_roof_system} | Name: ${p.contractor_name}`);
  console.log(`   Desc: ${p.raw_description}\n`);
}

// 2. Check around 711 W Canty St (Bishop Arts / Oak Cliff) and 4849 Memphis St (Castro HQ in Brookhollow / Trinity Industrial)
const canty = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE (normalized_address ILIKE '%canty%' OR normalized_address ILIKE '%memphis st%')
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- CANTY / MEMPHIS PERMITS ---');
for (const r of canty.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

// 3. Check around 601 Weatherford St, Fort Worth
const weatherford = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%weatherford st%'
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- WEATHERFORD ST PERMITS ---');
for (const r of weatherford.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

await client.end();

