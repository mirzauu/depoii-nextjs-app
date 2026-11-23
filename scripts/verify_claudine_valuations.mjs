import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const res = await client.query(`
  SELECT 
    raw_permit_number,
    issue_date,
    contractor_name,
    valuation,
    valuation_formatted,
    raw_description,
    source_system,
    source_record_id,
    source_url
  FROM warehouse.normalized_permits
  WHERE raw_permit_number IN ('COM-ROOF-25-000130', 'COM-ROOF-26-000280');
`);

console.log('Permits raw valuation query:');
console.log(JSON.stringify(res.rows, null, 2));

await client.end();

