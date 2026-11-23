import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const res = await client.query(`
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
  SELECT parcel_id, COUNT(*) as count, ARRAY_AGG(normalized_address) as addresses
  FROM empire_dallas
  WHERE parcel_id IS NOT NULL
  GROUP BY parcel_id
  HAVING COUNT(*) > 1;
`);

console.log('Parcels with multiple addresses/permits:', res.rows);

await client.end();

