import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Query exact properties and addresses for the 48 Dallas permits
const q = await client.query(`
  WITH empire_dallas AS (
    SELECT 
      raw_permit_number,
      normalized_address,
      parcel_id,
      valuation,
      issue_date
    FROM warehouse.normalized_permits
    WHERE (contractor_name ILIKE '%empire roofing%' OR contractor_id IN (SELECT id FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%empire roofing%'))
      AND jurisdiction ILIKE '%Dallas%'
  )
  SELECT 
    COUNT(*) as total_permits,
    COUNT(DISTINCT normalized_address) as unique_street_addresses,
    COUNT(DISTINCT parcel_id) as unique_parcel_ids
  FROM empire_dallas;
`);

console.log('Summary of the 48 Dallas permits:', q.rows[0]);

// Find which properties have MORE than 1 permit
const multi = await client.query(`
  WITH empire_dallas AS (
    SELECT 
      raw_permit_number,
      normalized_address,
      parcel_id,
      valuation,
      issue_date
    FROM warehouse.normalized_permits
    WHERE (contractor_name ILIKE '%empire roofing%' OR contractor_id IN (SELECT id FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%empire roofing%'))
      AND jurisdiction ILIKE '%Dallas%'
  )
  SELECT 
    normalized_address,
    COUNT(*) as permit_count,
    ARRAY_AGG(raw_permit_number) as permit_numbers,
    SUM(COALESCE(valuation, 0)) as total_address_valuation
  FROM empire_dallas
  GROUP BY normalized_address
  HAVING COUNT(*) > 1
  ORDER BY permit_count DESC;
`);

console.log('Properties with MULTIPLE permits from Empire:', multi.rows);

await client.end();

