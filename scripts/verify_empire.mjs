import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Get recent Empire permits
const empirePermits = await client.query(`
  SELECT raw_permit_number, normalized_address, city, zip_code, valuation, issue_date, square_footage, probable_roof_system, raw_description, contractor_name
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%empire roofing%'
  ORDER BY issue_date DESC NULLS LAST
  LIMIT 15;
`);
console.log('--- EMPIRE RECENT PERMITS ---');
console.log(JSON.stringify(empirePermits.rows, null, 2));

// 2. Check encroachments for Empire
const encroachments = await client.query(`
  SELECT *
  FROM warehouse.contractor_encroachments
  WHERE defending_org_id ILIKE '%empire%' OR encroaching_contractor_name ILIKE '%empire%'
  LIMIT 10;
`);
console.log('--- EMPIRE ENCROACHMENTS ---');
console.log(JSON.stringify(encroachments.rows, null, 2));

await client.end();

