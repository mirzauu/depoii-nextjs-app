import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Strictly dedicated roofing specialists ranked by total roofing valuation
const specialistValRankQuery = `
  WITH roofer_permits AS (
    SELECT 
      c.id,
      c.canonical_name,
      c.phone_number,
      c.rcat_license_number,
      c.bbb_rating,
      COUNT(p.id) as dallas_roofing_permits,
      SUM(COALESCE(p.valuation, 0)) as total_roofing_valuation,
      ROUND(AVG(COALESCE(p.valuation, 0))) as avg_permit_valuation,
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
      AND (
        c.canonical_name ILIKE '%roof%'
        OR c.canonical_name ILIKE '%sheet metal%'
        OR c.rcat_license_number IS NOT NULL
        OR c.canonical_name IN (
          'K Post Company', 'Supreme Roofing Lp', 'Empire Roofing Co', 'Texas Roof Management',
          'Camp Construction Company', 'Capitol Painting & Construction', 'Aston Sanderlin',
          'Claudine Cooper', 'Precision Roofing Inc'
        )
      )
      AND c.canonical_name NOT ILIKE '%electric%'
      AND c.canonical_name NOT ILIKE '%mechanical%'
      AND c.canonical_name NOT ILIKE '%security%'
      AND c.canonical_name NOT IN ('On Municipal Record', ', ,   ()', 'Licensed Commercial Contractor', 'UNKNOWN', 'N/A')
    GROUP BY c.id, c.canonical_name, c.phone_number, c.rcat_license_number, c.bbb_rating
    HAVING SUM(COALESCE(p.valuation, 0)) > 0
    ORDER BY total_roofing_valuation DESC
    LIMIT 25
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
    roof_systems
  FROM roofer_permits;
`;

const res = await client.query(specialistValRankQuery);
console.log(JSON.stringify(res.rows, null, 2));

await client.end();

