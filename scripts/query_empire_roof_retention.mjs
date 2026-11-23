import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Check if any roofer or competitor pulled a roof permit AFTER Empire on these properties
const roofCompetitorQuery = `
  WITH empire_permits AS (
    SELECT 
      p.parcel_id,
      p.normalized_address,
      p.raw_permit_number as empire_permit,
      p.issue_date as empire_date,
      p.valuation as empire_val
    FROM warehouse.normalized_permits p
    WHERE (p.contractor_name ILIKE '%empire roofing%'
       OR p.contractor_id IN (SELECT id FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%empire roofing%'))
      AND p.parcel_id IS NOT NULL
  )
  SELECT 
    ep.normalized_address,
    TO_CHAR(ep.empire_date, 'YYYY-MM-DD') as empire_date,
    sub.raw_permit_number as subsequent_roof_permit,
    TO_CHAR(sub.issue_date, 'YYYY-MM-DD') as subsequent_date,
    sub.contractor_name as subsequent_contractor,
    sub.valuation as subsequent_valuation,
    sub.raw_description as subsequent_description
  FROM empire_permits ep
  JOIN warehouse.normalized_permits sub 
    ON sub.parcel_id = ep.parcel_id 
   AND sub.issue_date > ep.empire_date
  WHERE (sub.category ILIKE '%roof%' 
     OR sub.raw_description ILIKE '%roof%' 
     OR sub.contractor_name ILIKE '%roof%'
     OR sub.is_pure_reroof = true);
`;

const res = await client.query(roofCompetitorQuery);
console.log(`Subsequent ROOFING permits on Empire properties: ${res.rows.length}`);
console.log(JSON.stringify(res.rows, null, 2));

await client.end();

