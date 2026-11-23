import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const cols = await client.query(`
  SELECT column_name FROM information_schema.columns 
  WHERE table_schema = 'warehouse' AND table_name = 'normalized_permits'
`);
console.log('Columns in normalized_permits:', cols.rows.map(r => r.column_name).join(', '));

const targets = ['007214E0010000000', '007212000H0010000', '007212000F0010000', '0072020C000000100'];

const perm = await client.query(`
  SELECT *
  FROM warehouse.normalized_permits
  WHERE parcel_id = ANY($1)
`, [targets.map(t => 'DCAD-PARCEL-' + t)]);

console.log('Permits found:', perm.rows);

await client.end();

