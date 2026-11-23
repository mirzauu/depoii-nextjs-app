import https from 'https';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Check if these permit numbers exist in normalized_permits regardless of contractor_name
const checkNumbers = [
  '1805045014',
  '2408295007',
  '1909121101',
  '2410085001',
  'COM-ROOF-25-000059',
  '2005185008'
];

const res = await client.query(`
  SELECT raw_permit_number, normalized_address, contractor_name, jurisdiction, source_system
  FROM warehouse.normalized_permits
  WHERE raw_permit_number LIKE ANY($1);
`, [checkNumbers.map(n => `%${n}%`)]);

console.log('Match test in DB:', res.rows);

await client.end();

