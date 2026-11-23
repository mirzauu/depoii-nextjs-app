import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check Hutton Dr & Valwood Industrial Corridor
const hutton = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE (normalized_address ILIKE '%hutton%' OR normalized_address ILIKE '%valwood%')
  ORDER BY issue_date DESC
  LIMIT 20;
`);
console.log('--- HUTTON / VALWOOD PERMITS ---');
for (const r of hutton.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

// 2. Also check Farmers Branch commercial roof permits
const fb = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE (city ILIKE '%farmers branch%' OR zip_code = '75234')
    AND (raw_description ILIKE '%roof%' OR raw_description ILIKE '%tpo%' OR raw_description ILIKE '%waterproof%')
  ORDER BY issue_date DESC
  LIMIT 20;
`);
console.log('--- FARMERS BRANCH / 75234 ROOF PERMITS ---');
for (const r of fb.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

await client.end();

