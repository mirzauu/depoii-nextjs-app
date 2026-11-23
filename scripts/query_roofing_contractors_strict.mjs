import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Strictly roofing contractors from canonical registry (RCAT licensed, or name/trade explicitly contains 'roof')
const canonicalRoofing = await client.query(`
  SELECT 
    COUNT(*) as total_canonical_roofers,
    COUNT(*) FILTER (WHERE headquarters_city ILIKE 'Dallas' OR hq_address ILIKE '%Dallas%') as dallas_proper_canonical,
    COUNT(*) FILTER (WHERE rcat_license_number IS NOT NULL) as rcat_licensed,
    COUNT(*) FILTER (WHERE bbb_rating IS NOT NULL) as bbb_rated
  FROM warehouse.canonical_contractors
  WHERE canonical_name ILIKE '%roof%' 
     OR primary_roof_system IS NOT NULL 
     OR rcat_license_number IS NOT NULL;
`);

// 2. Distinct named contractors on pure reroof or roofing permits in City of Dallas
const permitRoofing = await client.query(`
  SELECT 
    COUNT(DISTINCT contractor_name) as distinct_contractors,
    COUNT(*) as total_roofing_permits
  FROM warehouse.normalized_permits
  WHERE jurisdiction ILIKE '%Dallas%'
    AND contractor_name IS NOT NULL
    AND contractor_name NOT IN ('On Municipal Record', ', ,   ()', 'Licensed Commercial Contractor', 'UNKNOWN', 'N/A')
    AND (
      is_pure_reroof = true 
      OR category ILIKE '%roof%' 
      OR raw_description ILIKE '%roof%' 
      OR contractor_name ILIKE '%roof%'
    );
`);

// 3. Top true roofing contractors with permit counts in Dallas
const topRoofers = await client.query(`
  SELECT contractor_name, COUNT(*) as permit_count
  FROM warehouse.normalized_permits
  WHERE jurisdiction ILIKE '%Dallas%'
    AND contractor_name IS NOT NULL
    AND contractor_name NOT IN ('On Municipal Record', ', ,   ()', 'Licensed Commercial Contractor', 'UNKNOWN', 'N/A')
    AND (
      is_pure_reroof = true 
      OR category ILIKE '%roof%' 
      OR raw_description ILIKE '%roof%' 
      OR contractor_name ILIKE '%roof%'
    )
  GROUP BY contractor_name
  ORDER BY permit_count DESC
  LIMIT 15;
`);

console.log(JSON.stringify({
  canonicalRoofing: canonicalRoofing.rows[0],
  permitRoofing: permitRoofing.rows[0],
  topRoofers: topRoofers.rows
}, null, 2));

await client.end();

