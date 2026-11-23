import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const res = await client.query(`
  WITH target_roofers AS (
    SELECT DISTINCT contractor_name
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
  )
  SELECT 
    COUNT(*) as total_contractors,
    COUNT(c.id) as in_canonical,
    COUNT(*) FILTER (WHERE c.headquarters_city IS NOT NULL OR c.hq_address IS NOT NULL) as has_address_city,
    COUNT(*) FILTER (WHERE c.phone_number IS NOT NULL) as has_phone,
    COUNT(*) FILTER (WHERE c.total_permits > 0) as has_permit_history,
    COUNT(*) FILTER (WHERE c.total_valuation > 0) as has_valuation_history,
    COUNT(*) FILTER (WHERE c.bbb_rating IS NOT NULL) as has_bbb,
    COUNT(*) FILTER (WHERE c.rcat_license_number IS NOT NULL) as has_rcat
  FROM target_roofers tr
  JOIN warehouse.canonical_contractors c 
    ON LOWER(TRIM(tr.contractor_name)) = LOWER(TRIM(c.canonical_name));
`);

console.log('Contractor Profile Audit for all 1,718 Roofers:', res.rows[0]);

await client.end();

