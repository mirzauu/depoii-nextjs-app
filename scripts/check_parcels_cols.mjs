import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const cols = await client.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'warehouse' AND table_name = 'parcels';
`);
console.log('parcels cols:', cols.rows.map(r => r.column_name));

const parcels = await client.query(`
  SELECT id, parcel_number, address, city, state, zip_code, year_built, property_use
  FROM warehouse.parcels
  WHERE address ILIKE '%COLE%' OR address ILIKE '%WESTMORELAND%' OR address ILIKE '%ROCK QUARRY%'
  LIMIT 5;
`);
console.log('sample parcels:', parcels.rows);

await client.end();
