import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Let's inspect raw_description or any notes in normalized_permits for NP24-205301074
const p = await client.query(`
  SELECT * FROM warehouse.normalized_permits 
  WHERE raw_permit_number = '205301074'
`);
console.log('Permit record:', p.rows[0]);

// Also check if there's any other table in raw schema or data_lake
const tables = await client.query(`
  SELECT table_schema, table_name 
  FROM information_schema.tables 
  WHERE table_name ILIKE '%205301074%' OR table_name ILIKE '%permit%' OR table_name ILIKE '%legacy%'
`);
console.log('Tables:', tables.rows);

await client.end();

