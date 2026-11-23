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
    SELECT raw_permit_number, issue_date, contractor_name, contractor_phone, owner_phone, architect_name, raw_description
    FROM warehouse.normalized_permits
    WHERE normalized_address ILIKE $1
    ORDER BY issue_date DESC NULLS LAST
    LIMIT 5
  `, ['%' + num + '%' + street + '%']);
  
  console.log(`\n=== ${a} ===`);
  for (const r of res.rows) {
    console.log(`  Permit: ${r.raw_permit_number} | Contr: ${r.contractor_name} | C-Phone: ${r.contractor_phone || 'None'} | O-Phone: ${r.owner_phone || 'None'} | Arch: ${r.architect_name || 'None'}`);
    if (r.raw_description) {
      console.log(`    Desc: ${r.raw_description.replace(/\n/g, ' ').slice(0, 150)}`);
    }
  }
}

await client.end();
