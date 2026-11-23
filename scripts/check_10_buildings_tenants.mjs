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
  
  const permits = await client.query(`
    SELECT raw_permit_number, issue_date, category, raw_description, contractor_name, valuation, architect_name, design_firm, owner_phone
    FROM warehouse.normalized_permits
    WHERE normalized_address ILIKE $1
    ORDER BY issue_date DESC NULLS LAST
    LIMIT 6
  `, ['%' + num + '%' + street + '%']);
  
  console.log('=== ' + a + ' ===');
  if (permits.rows.length === 0) {
    console.log('  No permits in DB');
  }
  for (const p of permits.rows) {
    console.log(`  ${p.issue_date ? p.issue_date.toISOString().slice(0,10) : 'N/A'} | ${p.raw_permit_number} | Val: $${p.valuation} | Contr: ${p.contractor_name} | Arch: ${p.architect_name || 'N/A'} | Desc: ${p.raw_description ? p.raw_description.replace(/\n/g, ' ').slice(0, 140) : ''}`);
  }
}
await client.end();
