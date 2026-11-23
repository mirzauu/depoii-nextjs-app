import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Let's check where Empire pulled permits on Chartwell, Buckner, Vantage, or nearby
const empireJobs = await client.query(`
  SELECT raw_permit_number, issue_date, contractor_name, valuation, square_footage, normalized_address, raw_description
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%empire roofing%'
    AND (
      normalized_address ILIKE '%BUCKNER%'
      OR normalized_address ILIKE '%CHARTWELL%'
      OR normalized_address ILIKE '%VANTAGE%'
      OR normalized_address ILIKE '%PIPESTONE%'
      OR normalized_address ILIKE '%MANOR%'
      OR normalized_address ILIKE '%COCKRELL%'
    )
  ORDER BY issue_date DESC
`);
console.log('Empire jobs matching those areas:');
console.log(JSON.stringify(empireJobs.rows, null, 2));

await client.end();

