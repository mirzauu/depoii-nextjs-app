import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check Fort Worth permits for Lon Smith
const fw = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%lon smith%'
    AND city ILIKE '%fort worth%'
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 10;
`);
console.log('--- LON SMITH FORT WORTH PERMITS ---');
for (const p of fw.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} (${p.city}, ${p.zip_code}) | Val: $${p.valuation} | System: ${p.probable_roof_system}`);
  console.log(`   Desc: ${p.raw_description?.slice(0, 150)}\n`);
}

// 2. Check around 8721 Forney Rd, Dallas (Forney Industrial Corridor)
const forneyNeighbors = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%forney rd%'
  ORDER BY issue_date DESC;
`);
console.log('--- FORNEY RD PERMITS ---');
for (const r of forneyNeighbors.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

await client.end();

