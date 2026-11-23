import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Get Lon Smith permits across DFW
const permits = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%lon smith%'
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 25;
`);

console.log('--- LON SMITH PERMITS RECENT ---');
for (const p of permits.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} (${p.city}, ${p.zip_code}) | Val: $${p.valuation} | System: ${p.probable_roof_system}`);
  console.log(`   Desc: ${p.raw_description?.slice(0, 150)}\n`);
}

// 2. Check higher-value or commercial Lon Smith permits
const commercial = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%lon smith%'
    AND (valuation > 30000 OR raw_description ILIKE '%commercial%' OR raw_description ILIKE '%multi%' OR raw_description ILIKE '%flat%')
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 15;
`);

console.log('--- LON SMITH COMMERCIAL / HIGH-VALUATION PERMITS ---');
for (const p of commercial.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} (${p.city}, ${p.zip_code}) | Val: $${p.valuation} | System: ${p.probable_roof_system}`);
  console.log(`   Desc: ${p.raw_description?.slice(0, 150)}\n`);
}

await client.end();

