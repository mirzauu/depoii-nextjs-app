import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Inspect Texas Roof Management permits in normalized_permits
const permits = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%texas roof management%'
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 20;
`);

console.log('--- TEXAS ROOF MANAGEMENT PERMITS ---');
for (const p of permits.rows) {
  console.log(`[${p.raw_permit_number}] ${p.issue_date?.toISOString()?.slice(0,10)} | ${p.normalized_address} (${p.city}, ${p.zip_code}) | Val: $${p.valuation} | System: ${p.probable_roof_system} | Name: ${p.contractor_name}`);
  console.log(`   Desc: ${p.raw_description}\n`);
}

// 2. Also check Lingco Dr Richardson and surrounding Telecom Corridor
const lingco = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%lingco%'
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- LINGCO DR PERMITS ---', lingco.rows.length);

await client.end();

