import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Get KPost commercial permits across all variations
const permits = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE (contractor_name ILIKE '%kpost%' OR contractor_name ILIKE '%k post%')
    AND valuation > 50000
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 20;
`);

console.log('--- KPOST COMMERCIAL PERMITS (> $50k) ---');
for (const p of permits.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} (${p.city}, ${p.zip_code}) | Val: $${p.valuation} | System: ${p.probable_roof_system} | Name: ${p.contractor_name}`);
  console.log(`   Desc: ${p.raw_description?.slice(0, 150)}\n`);
}

// 2. Also check all KPost permits with specific roof/commercial keywords
const allCommercial = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE (contractor_name ILIKE '%kpost%' OR contractor_name ILIKE '%k post%')
    AND (raw_description ILIKE '%roof%' OR raw_description ILIKE '%tpo%' OR raw_description ILIKE '%commercial%' OR raw_description ILIKE '%membrane%')
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 20;
`);

console.log('--- KPOST COMMERCIAL ROOF PERMITS ---');
for (const p of allCommercial.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} (${p.city}, ${p.zip_code}) | Val: $${p.valuation} | System: ${p.probable_roof_system} | Name: ${p.contractor_name}`);
  console.log(`   Desc: ${p.raw_description?.slice(0, 150)}\n`);
}

await client.end();

