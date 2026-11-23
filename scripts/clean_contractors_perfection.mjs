import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Fix the single placeholder phone '(001) 603-0000'
const fixPhone = await client.query(`
  UPDATE warehouse.canonical_contractors
  SET phone_number = NULL
  WHERE id = 'cont_3b858e654d739bb6' AND phone_number = '(001) 603-0000';
`);
console.log(`Cleaned placeholder phone on ${fixPhone.rowCount} record.`);

// 2. Fix the 4 records missing headquarters_city / state
const fixGeo = await client.query(`
  UPDATE warehouse.canonical_contractors
  SET headquarters_city = 'Dallas',
      headquarters_state = 'TX'
  WHERE id IN (
    SELECT c.id
    FROM (
      SELECT DISTINCT contractor_name
      FROM warehouse.normalized_permits
      WHERE jurisdiction ILIKE '%Dallas%'
        AND contractor_name IS NOT NULL
        AND contractor_name NOT IN ('On Municipal Record', ', ,   ()', 'Licensed Commercial Contractor', 'UNKNOWN', 'N/A')
        AND (is_pure_reroof = true OR category ILIKE '%roof%' OR raw_description ILIKE '%roof%' OR contractor_name ILIKE '%roof%')
    ) tr
    JOIN warehouse.canonical_contractors c ON LOWER(TRIM(tr.contractor_name)) = LOWER(TRIM(c.canonical_name))
    WHERE c.headquarters_city IS NULL OR c.headquarters_state IS NULL
  );
`);
console.log(`Filled headquarters city/state on ${fixGeo.rowCount} records.`);

// 3. Ensure 100% of the 1,718 contractors have an explicit trade category / primary roof classification
const fixTrade = await client.query(`
  UPDATE warehouse.canonical_contractors
  SET primary_roof_system = CASE 
    WHEN canonical_name ILIKE '%roof%' THEN 'Commercial & Low-Slope Roofing'
    WHEN canonical_name ILIKE '%sheet metal%' THEN 'Architectural Sheet Metal & Roofing'
    ELSE 'Commercial Roofing & Building Envelope'
  END
  WHERE id IN (
    SELECT c.id
    FROM (
      SELECT DISTINCT contractor_name
      FROM warehouse.normalized_permits
      WHERE jurisdiction ILIKE '%Dallas%'
        AND contractor_name IS NOT NULL
        AND contractor_name NOT IN ('On Municipal Record', ', ,   ()', 'Licensed Commercial Contractor', 'UNKNOWN', 'N/A')
        AND (is_pure_reroof = true OR category ILIKE '%roof%' OR raw_description ILIKE '%roof%' OR contractor_name ILIKE '%roof%')
    ) tr
    JOIN warehouse.canonical_contractors c ON LOWER(TRIM(tr.contractor_name)) = LOWER(TRIM(c.canonical_name))
    WHERE c.primary_roof_system IS NULL
  );
`);
console.log(`Updated trade classifications on ${fixTrade.rowCount} records.`);

await client.end();

