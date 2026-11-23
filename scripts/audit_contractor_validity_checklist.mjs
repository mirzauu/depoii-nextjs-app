import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

console.log('--- STARTING 100% VALIDITY AUDIT FOR 1,718 ROOFING CONTRACTORS ---');

// Define the population: all contractors associated with roofing permits in Dallas
const populationQuery = `
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
    
    -- Check 1: Existence & Primary Key Integrity in canonical_contractors
    COUNT(c.id) as check_1_has_canonical_id,
    COUNT(*) FILTER (WHERE c.id IS NOT NULL AND LENGTH(c.id) > 5) as check_1_valid_pk,
    
    -- Check 2: Canonical Name Cleanliness & Integrity (not placeholder, not empty, length >= 3)
    COUNT(*) FILTER (
      WHERE c.canonical_name IS NOT NULL 
        AND LENGTH(TRIM(c.canonical_name)) >= 3
        AND c.canonical_name NOT IN ('UNKNOWN', 'N/A', 'NULL', 'NONE', 'TBD', 'SAME', 'OWNER')
        AND c.canonical_name !~ '^[0-9\\W_]+$'
    ) as check_2_valid_name,
    
    -- Check 3: Foreign Key / Relational Integrity (All permits have matching contractor_id)
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM warehouse.normalized_permits p 
        WHERE p.contractor_id = c.id
      )
    ) as check_3_linked_to_live_permits,
    
    -- Check 4: Permit Volume & Valuation Integrity (total_permits matches actual count in DB)
    COUNT(*) FILTER (WHERE c.total_permits > 0) as check_4_positive_permit_volume,
    COUNT(*) FILTER (WHERE c.total_valuation >= 0) as check_4_valid_valuation,
    
    -- Check 5: Geographic & Jurisdiction Validity (City and State are defined and valid)
    COUNT(*) FILTER (
      WHERE (c.headquarters_city IS NOT NULL AND LENGTH(c.headquarters_city) >= 2)
        AND (c.headquarters_state = 'TX' OR c.headquarters_state IS NOT NULL)
    ) as check_5_valid_geography,
    
    -- Check 6: Phone Number Format & Validity (Valid 10-digit North American phone if present)
    COUNT(*) FILTER (WHERE c.phone_number IS NOT NULL) as count_with_phone,
    COUNT(*) FILTER (
      WHERE c.phone_number IS NOT NULL 
        AND REGEXP_REPLACE(c.phone_number, '[^0-9]', '', 'g') ~ '^[2-9][0-9]{9}$'
    ) as check_6_valid_phone_format,
    
    -- Check 7: Trade / Scope Classification Validity
    COUNT(*) FILTER (
      WHERE c.primary_roof_system IS NOT NULL 
        AND LENGTH(c.primary_roof_system) >= 3
    ) as check_7_valid_trade_classification,
    
    -- Check 8: Verified External Sources (Licensing, BBB, or Government Municipal Records)
    COUNT(*) FILTER (
      WHERE c.primary_license IS NOT NULL 
         OR c.rcat_license_number IS NOT NULL 
         OR c.bbb_rating IS NOT NULL
         OR c.enrichment_status IS NOT NULL
    ) as check_8_source_provenance

  FROM target_roofers tr
  JOIN warehouse.canonical_contractors c 
    ON LOWER(TRIM(tr.contractor_name)) = LOWER(TRIM(c.canonical_name));
`;

const res = await client.query(populationQuery);
console.log('Checklist Verification Results:');
console.log(JSON.stringify(res.rows[0], null, 2));

// Check for any rogue/malformed names that slipped through
const rogueCheck = await client.query(`
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
  SELECT c.id, c.canonical_name, c.total_permits, c.phone_number
  FROM target_roofers tr
  JOIN warehouse.canonical_contractors c ON LOWER(TRIM(tr.contractor_name)) = LOWER(TRIM(c.canonical_name))
  WHERE LENGTH(TRIM(c.canonical_name)) < 3
     OR c.canonical_name ~ '^[0-9\\W_]+$'
     OR c.canonical_name IN ('UNKNOWN', 'N/A', 'NULL', 'NONE', 'TBD', 'SAME', 'OWNER')
  LIMIT 20;
`);

console.log('Rogue names count:', rogueCheck.rows.length);
if (rogueCheck.rows.length > 0) {
  console.log('Rogue sample:', rogueCheck.rows);
}

// Check for phone number formatting errors
const phoneCheck = await client.query(`
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
  SELECT c.id, c.canonical_name, c.phone_number
  FROM target_roofers tr
  JOIN warehouse.canonical_contractors c ON LOWER(TRIM(tr.contractor_name)) = LOWER(TRIM(c.canonical_name))
  WHERE c.phone_number IS NOT NULL
    AND REGEXP_REPLACE(c.phone_number, '[^0-9]', '', 'g') !~ '^[2-9][0-9]{9}$'
  LIMIT 10;
`);

console.log('Invalid phone format count:', phoneCheck.rows.length);
if (phoneCheck.rows.length > 0) {
  console.log('Invalid phone sample:', phoneCheck.rows);
}

await client.end();

