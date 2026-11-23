import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check Stratum Dr and surrounding Fossil Creek / Sandshell Dr / Beach St corridor in Fort Worth
const stratum = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE (normalized_address ILIKE '%stratum%' OR normalized_address ILIKE '%sandshell%')
  ORDER BY issue_date DESC;
`);
console.log('--- STRATUM / SANDSHELL PERMITS ---');
for (const r of stratum.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

// 2. Check around 5938 Skillman St Dallas
const skillman = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%skillman%'
    AND (raw_description ILIKE '%roof%' OR raw_description ILIKE '%commercial%' OR raw_description ILIKE '%alteration%')
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- SKILLMAN ST PERMITS ---');
for (const r of skillman.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

await client.end();

