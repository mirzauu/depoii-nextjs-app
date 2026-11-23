import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check Fort Worth Ave commercial permits
const ftwAve = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%fort worth ave%'
    AND (raw_description ILIKE '%roof%' OR raw_description ILIKE '%tpo%' OR raw_description ILIKE '%commercial%' OR raw_description ILIKE '%alteration%')
  ORDER BY issue_date DESC
  LIMIT 15;
`);
console.log('--- FORT WORTH AVE PERMITS ---');
for (const r of ftwAve.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

// 2. Check N Henderson Ave commercial permits
const henderson = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%henderson ave%'
  ORDER BY issue_date DESC
  LIMIT 15;
`);
console.log('--- HENDERSON AVE PERMITS ---');
for (const r of henderson.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

await client.end();

