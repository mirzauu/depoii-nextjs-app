import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const res = await client.query(`
  SELECT 
    raw_permit_number,
    normalized_address,
    issue_date,
    contractor_name,
    raw_description,
    valuation
  FROM warehouse.normalized_permits
  WHERE source_system = 'NewPermit_2008_2024'
    AND contractor_name ILIKE '%empire%'
  LIMIT 10;
`);

console.log('Empire permits from NewPermit_2008_2024:', res.rows);

await client.end();

