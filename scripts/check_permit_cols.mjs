import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const sample = await client.query('SELECT * FROM warehouse.normalized_permits LIMIT 1');
console.log('Permit columns:', Object.keys(sample.rows[0]));

await client.end();
