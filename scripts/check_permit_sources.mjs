import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const res = await client.query(`
  SELECT DISTINCT data_source, source_system, jurisdiction, count(*)
  FROM warehouse.normalized_permits 
  WHERE contractor_name ILIKE '%empire roofing%'
     OR contractor_id IN (SELECT id FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%empire roofing%')
  GROUP BY data_source, source_system, jurisdiction;
`);

console.log('Permit Sources in DB:', res.rows);

await client.end();

