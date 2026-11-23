import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Query roofing companies ranked strictly by total verified Dallas municipal roofing valuation
const valRankQuery = `
  WITH roofer_permits AS (
    SELECT 
      c.id,
      c.canonical_name,
      c.phone_number,
      c.primary_license,
      c.rcat_license_number,
      c.bbb_rating,
      COUNT(p.id) as dallas_roofing_permits,
      SUM(COALESCE(p.valuation, 0)) as total_roofing_valuation,
      ROUND(AVG(COALESCE(p.valuation, 0))) as avg_permit_valuation,
      MIN(p.issue_date) as earliest_permit_date,
      MAX(p.issue_date) as latest_permit_date,
      ARRAY_AGG(DISTINCT p.probable_roof_system) FILTER (WHERE p.probable_roof_system IS NOT NULL) as roof_systems
    FROM warehouse.canonical_contractors c
    JOIN warehouse.normalized_permits p ON p.contractor_id = c.id
    WHERE p.jurisdiction ILIKE '%Dallas%'
      AND (
        p.is_pure_reroof = true 
        OR p.category ILIKE '%roof%' 
        OR p.raw_description ILIKE '%roof%' 
        OR p.contractor_name ILIKE '%roof%'
      )
      AND c.canonical_name NOT IN ('On Municipal Record', ', ,   ()', 'Licensed Commercial Contractor', 'UNKNOWN', 'N/A')
    GROUP BY c.id, c.canonical_name, c.phone_number, c.primary_license, c.rcat_license_number, c.bbb_rating
    HAVING SUM(COALESCE(p.valuation, 0)) > 0
    ORDER BY total_roofing_valuation DESC
    LIMIT 30
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY total_roofing_valuation DESC) as rank,
    canonical_name,
    total_roofing_valuation,
    dallas_roofing_permits,
    avg_permit_valuation,
    phone_number,
    rcat_license_number,
    bbb_rating,
    TO_CHAR(earliest_permit_date, 'YYYY-MM-DD') as first_permit,
    TO_CHAR(latest_permit_date, 'YYYY-MM-DD') as last_permit,
    roof_systems
  FROM roofer_permits;
`;

const res = await client.query(valRankQuery);
console.log(JSON.stringify(res.rows, null, 2));

await client.end();

