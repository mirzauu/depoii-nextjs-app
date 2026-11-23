import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const addrs = [
  '1444 N Cockrell Hill Rd',
  '4040 Pipestone Rd',
  '3737 Rock Quarry Rd',
  '1251 N Cockrell Hill Rd',
  '3660 Pipestone Rd',
  '3300 W Mockingbird Ln',
  '5200 Alpha Rd',
  '4825 Cole Ave',
  '1600 S Westmoreland Rd',
  '4038 Rock Quarry Rd'
];

for (const a of addrs) {
  const parts = a.split(' ');
  const num = parts[0];
  const street = parts[1];
  
  const res = await client.query(`
    SELECT raw_permit_number, source_url, source_record_id, issue_date
    FROM warehouse.normalized_permits
    WHERE normalized_address ILIKE $1
    ORDER BY issue_date DESC NULLS LAST
    LIMIT 3
  `, ['%' + num + '%' + street + '%']);
  
  console.log(`=== ${a} ===`);
  for (const r of res.rows) {
    console.log(`  Permit: ${r.raw_permit_number} | SourceURL: ${r.source_url || 'None'} | RecordID: ${r.source_record_id}`);
  }
}

await client.end();
