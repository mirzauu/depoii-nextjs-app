import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const res = await client.query(`
  SELECT 
    COUNT(*) as total_canonical_matched,
    COUNT(*) FILTER (WHERE c.hq_address IS NOT NULL OR c.headquarters_city IS NOT NULL) as has_location,
    COUNT(*) FILTER (WHERE c.phone_number IS NOT NULL) as has_phone,
    COUNT(*) FILTER (WHERE c.website_url IS NOT NULL) as has_website,
    COUNT(*) FILTER (WHERE c.bbb_rating IS NOT NULL) as has_bbb,
    COUNT(*) FILTER (WHERE c.rcat_license_number IS NOT NULL) as has_rcat
  FROM (
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
  ) pr
  JOIN warehouse.canonical_contractors c 
    ON LOWER(TRIM(pr.contractor_name)) = LOWER(TRIM(c.canonical_name));
`);

console.log('Enrichment breakdown for the 1,095 matched canonical contractors:', res.rows[0]);

await client.end();

