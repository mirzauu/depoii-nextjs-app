import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Inspect Chamberlin permits across all variations
const permits = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%chamberlin%'
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 20;
`);

console.log('--- CHAMBERLIN PERMITS ---');
for (const p of permits.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} (${p.city}, ${p.zip_code}) | Val: $${p.valuation} | System: ${p.probable_roof_system} | Name: ${p.contractor_name}`);
  console.log(`   Desc: ${p.raw_description?.slice(0, 150)}\n`);
}

// 2. Also check canonical contractors table for Chamberlin data
const canonical = await client.query(`
  SELECT * FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%chamberlin%';
`);
console.log('--- CHAMBERLIN CANONICAL ---');
console.log(canonical.rows);

await client.end();

