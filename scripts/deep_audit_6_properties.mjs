import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const targetAddresses = [
  '3500 MANOR WAY',
  '2600 N STEMMONS FWY',
  '2838 ANODE LN',
  '4445 ROCK QUARRY RD',
  '6627 MAPLE AVE',
  '1341 W MOCKINGBIRD LN'
];

for (const addr of targetAddresses) {
  console.log(`\n======================================================`);
  console.log(`PROPERTY: ${addr}`);
  console.log(`======================================================`);
  
  const permits = await client.query(`
    SELECT 
      raw_permit_number,
      TO_CHAR(issue_date, 'YYYY-MM-DD') as issue_date,
      contractor_name,
      contractor_phone,
      valuation,
      category,
      probable_roof_system,
      raw_description
    FROM warehouse.normalized_permits
    WHERE normalized_address ILIKE $1
    ORDER BY issue_date ASC NULLS LAST;
  `, [`%${addr}%`]);
  
  console.log(`Total permits on record: ${permits.rows.length}`);
  for (const p of permits.rows) {
    console.log(`--------------------------------------------------`);
    console.log(`Permit: ${p.raw_permit_number} | Date: ${p.issue_date} | Val: $${p.valuation}`);
    console.log(`Contractor: ${p.contractor_name} (Phone: ${p.contractor_phone || 'N/A'})`);
    console.log(`Category: ${p.category} | System: ${p.probable_roof_system || 'N/A'}`);
    console.log(`Scope Description: ${p.raw_description}`);
  }
}

await client.end();

