import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Count permits per city in our normalized_permits table
const counts = await client.query(`
  SELECT 
    jurisdiction,
    source_system,
    COUNT(*) as total_permits,
    COUNT(*) FILTER (WHERE contractor_name ILIKE '%empire%') as empire_permits
  FROM warehouse.normalized_permits
  GROUP BY jurisdiction, source_system
  ORDER BY total_permits DESC;
`);

console.log('Jurisdiction Inventory:', counts.rows);

await client.end();

