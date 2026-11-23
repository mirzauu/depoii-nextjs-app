import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Check how many of the 1,718 distinct roofing contractor names from permits exist in warehouse.canonical_contractors
const checkMatch = await client.query(`
  WITH permit_roofers AS (
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
    COUNT(*) as total_permit_roofers,
    COUNT(c.id) as already_in_canonical,
    COUNT(*) - COUNT(c.id) as missing_from_canonical
  FROM permit_roofers pr
  LEFT JOIN warehouse.canonical_contractors c 
    ON LOWER(TRIM(pr.contractor_name)) = LOWER(TRIM(c.canonical_name));
`);

console.log('Match Status:', checkMatch.rows[0]);

// Sample 10 missing permit roofers to inspect what they look like
const sampleMissing = await client.query(`
  WITH permit_roofers AS (
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
  SELECT pr.contractor_name, COUNT(p.id) as permits_count
  FROM permit_roofers pr
  JOIN warehouse.normalized_permits p ON p.contractor_name = pr.contractor_name
  LEFT JOIN warehouse.canonical_contractors c 
    ON LOWER(TRIM(pr.contractor_name)) = LOWER(TRIM(c.canonical_name))
  WHERE c.id IS NULL
  GROUP BY pr.contractor_name
  ORDER BY permits_count DESC
  LIMIT 15;
`);

console.log('Top Missing Roofers Sample:', sampleMissing.rows);

await client.end();

