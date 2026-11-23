import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const p = await client.query(`
  SELECT 
    raw_permit_number, issue_date, contractor_name, raw_description, valuation, parcel_id, normalized_address
  FROM warehouse.normalized_permits 
  WHERE normalized_address ILIKE '%PIPESTONE%'
  ORDER BY issue_date DESC
`);
console.log('All permits on Pipestone Rd:', p.rows);

await client.end();

