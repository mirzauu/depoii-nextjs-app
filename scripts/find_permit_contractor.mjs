import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const contactCols = await client.query(`
  SELECT column_name FROM information_schema.columns 
  WHERE table_schema = 'warehouse' AND table_name = 'permit_contacts'
`);
console.log('permit_contacts cols:', contactCols.rows.map(r => r.column_name).join(', '));

const contacts = await client.query(`
  SELECT * FROM warehouse.permit_contacts 
  WHERE permit_no ILIKE '%205301074%'
`);
console.log('Permit contacts:', contacts.rows);

// Search if any table has 205301074 anywhere
const tables = await client.query(`
  SELECT table_schema, table_name 
  FROM information_schema.tables 
  WHERE table_schema IN ('warehouse', 'public', 'raw')
`);

for (const t of tables.rows) {
  try {
    const check = await client.query(`
      SELECT * FROM "${t.table_schema}"."${t.table_name}"
      WHERE CAST(to_jsonb("${t.table_name}".*) AS text) ILIKE '%205301074%'
      LIMIT 2
    `);
    if (check.rows.length > 0) {
      console.log(`Found in ${t.table_schema}.${t.table_name}:`, check.rows);
    }
  } catch (e) {
    // skip tables without compatible structures
  }
}

await client.end();
