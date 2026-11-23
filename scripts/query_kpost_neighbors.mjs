import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check Quaker St and surrounding Design District / Farrington St
const quakerNeighbors = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE (normalized_address ILIKE '%quaker%' OR normalized_address ILIKE '%farrington%')
  ORDER BY issue_date DESC;
`);
console.log('--- QUAKER / FARRINGTON PERMITS ---');
for (const r of quakerNeighbors.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

// 2. Check John W Carpenter Fwy corridor
const carpenterNeighbors = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%carpenter%'
    AND (raw_description ILIKE '%roof%' OR raw_description ILIKE '%tpo%' OR raw_description ILIKE '%alteration%' OR raw_description ILIKE '%remodel%')
  ORDER BY issue_date DESC
  LIMIT 15;
`);
console.log('--- CARPENTER FWY ROOF PERMITS ---');
for (const r of carpenterNeighbors.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

// 3. Check Beckley Ave (near 1441 N Beckley)
const beckleyNeighbors = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%beckley%'
    AND (raw_description ILIKE '%roof%' OR raw_description ILIKE '%tpo%')
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- BECKLEY AVE ROOF PERMITS ---');
for (const r of beckleyNeighbors.rows) {
  console.log(`${r.raw_permit_number} | ${r.normalized_address} | ${r.issue_date?.toISOString()?.slice(0,10)} | ${r.contractor_name} | $${r.valuation} | ${r.raw_description?.slice(0, 100)}`);
}

await client.end();

