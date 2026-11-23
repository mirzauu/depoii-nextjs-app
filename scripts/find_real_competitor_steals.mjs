import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Find where another roofer pulled permits on the SAME parcel as Empire:
const steals = await client.query(`
  SELECT 
    c.contractor_name as competitor_name,
    c.raw_permit_number as competitor_permit,
    c.issue_date as competitor_date,
    c.valuation as competitor_valuation,
    c.raw_description as competitor_scope,
    c.normalized_address as address,
    e.raw_permit_number as empire_permit,
    e.issue_date as empire_date,
    e.valuation as empire_val
  FROM warehouse.normalized_permits c
  JOIN warehouse.normalized_permits e 
    ON (c.parcel_id = e.parcel_id OR c.normalized_address = e.normalized_address)
  WHERE (e.contractor_name ILIKE '%empire roofing%')
    AND (c.contractor_name NOT ILIKE '%empire roofing%' AND c.contractor_name NOT ILIKE '%claudine cooper%' AND c.contractor_name NOT ILIKE '%on municipal%')
    AND (c.category ILIKE '%roof%' OR c.raw_description ILIKE '%roof%')
    AND c.contractor_name IS NOT NULL
  ORDER BY c.issue_date DESC
  LIMIT 20;
`);

console.log('\nDirect Competitor Captures on Empire Parcels:');
console.log(JSON.stringify(steals.rows, null, 2));

// Also check KPost Company jobs that are on adjacent addresses in Empire's industrial parks:
const kpostOverlap = await client.query(`
  SELECT 
    raw_permit_number, issue_date, contractor_name, valuation, square_footage, normalized_address, raw_description
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%k post%' 
    AND (
      normalized_address ILIKE '%PIPESTONE%'
      OR normalized_address ILIKE '%ROCK QUARRY%'
      OR normalized_address ILIKE '%REGAL ROW%'
      OR normalized_address ILIKE '%BASTILLE%'
      OR normalized_address ILIKE '%MANOR WAY%'
      OR normalized_address ILIKE '%ROSS AVE%'
    )
  ORDER BY issue_date DESC
`);
console.log('\nKPost in Empire Primary Corridors:');
console.log(JSON.stringify(kpostOverlap.rows, null, 2));

await client.end();
