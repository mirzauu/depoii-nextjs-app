import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Dallas Proper Canonical Roofing Contractors in warehouse.canonical_contractors
const q1 = await client.query(`
  SELECT COUNT(*) as total_dallas_roofers,
         COUNT(*) FILTER (WHERE rcat_license_number IS NOT NULL) as rcat_licensed,
         COUNT(*) FILTER (WHERE bbb_rating IS NOT NULL) as bbb_rated,
         COUNT(*) FILTER (WHERE total_permits > 0) as with_permit_history
  FROM warehouse.canonical_contractors
  WHERE headquarters_city ILIKE 'Dallas'
     OR hq_address ILIKE '%Dallas%';
`);

// 2. DFW Metro Canonical Roofing Contractors
const q2 = await client.query(`
  SELECT COUNT(*) as total_dfw_roofers,
         COUNT(*) FILTER (WHERE rcat_license_number IS NOT NULL) as rcat_licensed,
         COUNT(*) FILTER (WHERE bbb_rating IS NOT NULL) as bbb_rated
  FROM warehouse.canonical_contractors;
`);

// 3. Contractors with verified roofing permits issued in City of Dallas
const q3 = await client.query(`
  SELECT COUNT(DISTINCT contractor_name) as distinct_contractors_with_roof_permits
  FROM warehouse.normalized_permits
  WHERE jurisdiction ILIKE '%Dallas%'
    AND contractor_name IS NOT NULL
    AND (
      category ILIKE '%roof%' OR 
      probable_roof_system IS NOT NULL OR
      raw_description ILIKE '%roof%' OR 
      permit_scope ILIKE '%roof%' OR
      is_pure_reroof = true OR
      contractor_name ILIKE '%roof%'
    );
`);

// 4. Breakdown of top roofing contractors by Dallas permit volume
const q4 = await client.query(`
  SELECT contractor_name, COUNT(*) as permit_count
  FROM warehouse.normalized_permits
  WHERE jurisdiction ILIKE '%Dallas%'
    AND contractor_name IS NOT NULL
    AND (
      category ILIKE '%roof%' OR 
      probable_roof_system IS NOT NULL OR
      raw_description ILIKE '%roof%' OR 
      permit_scope ILIKE '%roof%' OR
      is_pure_reroof = true OR
      contractor_name ILIKE '%roof%'
    )
  GROUP BY contractor_name
  ORDER BY permit_count DESC
  LIMIT 10;
`);

console.log(JSON.stringify({
  dallas_canonical: q1.rows[0],
  dfw_canonical: q2.rows[0],
  dallas_permit_active: q3.rows[0],
  top_active_roofers: q4.rows
}, null, 2));

await client.end();
