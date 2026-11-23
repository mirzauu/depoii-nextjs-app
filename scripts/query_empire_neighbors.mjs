import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Check permits on Pipestone Rd
const pipestone = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%pipestone%'
  ORDER BY issue_date DESC;
`);
console.log('--- PIPESTONE RD PERMITS ---');
console.log(JSON.stringify(pipestone.rows, null, 2));

// Check permits on N Cockrell Hill Rd
const cockrell = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%cockrell hill%'
  ORDER BY issue_date DESC
  LIMIT 10;
`);
console.log('--- COCKRELL HILL PERMITS ---');
console.log(JSON.stringify(cockrell.rows, null, 2));

// Check permits on Foch St Fort Worth
const foch = await client.query(`
  SELECT raw_permit_number, normalized_address, valuation, issue_date, contractor_name, raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%foch st%'
  ORDER BY issue_date DESC;
`);
console.log('--- FOCH ST PERMITS ---');
console.log(JSON.stringify(foch.rows, null, 2));

await client.end();

