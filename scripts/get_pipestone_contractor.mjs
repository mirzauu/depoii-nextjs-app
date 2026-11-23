import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Check normalized_permits and raw permits or permit history for 4040 Pipestone Rd
const res = await client.query(`
  SELECT 
    id, 
    raw_permit_number, 
    issue_date, 
    contractor_name, 
    contractor_id, 
    raw_description, 
    valuation, 
    source_system, 
    data_source
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%4040 PIPESTONE%' OR parcel_id = 'DCAD-PARCEL-007214E0010000000'
  ORDER BY issue_date DESC
`);

console.log('Permits for 4040 Pipestone:');
console.log(JSON.stringify(res.rows, null, 2));

// Check if raw permit tables exist
const rawTables = await client.query(`
  SELECT table_schema, table_name 
  FROM information_schema.tables 
  WHERE table_name ILIKE '%permit%'
`);
console.log('Permit tables:', rawTables.rows);

await client.end();

