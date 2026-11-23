import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Get all parcels where Empire pulled permits along with Empire's permit issue date
const empireParcelsQuery = `
  WITH empire_permits AS (
    SELECT 
      p.parcel_id,
      p.normalized_address,
      p.raw_permit_number as empire_permit_number,
      p.issue_date as empire_permit_date,
      p.valuation as empire_valuation,
      p.probable_roof_system as empire_roof_system
    FROM warehouse.normalized_permits p
    WHERE (p.contractor_name ILIKE '%empire roofing%'
       OR p.contractor_id IN (SELECT id FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%empire roofing%'))
      AND p.parcel_id IS NOT NULL
  )
  SELECT 
    ep.parcel_id,
    ep.normalized_address,
    ep.empire_permit_number,
    TO_CHAR(ep.empire_permit_date, 'YYYY-MM-DD') as empire_permit_date,
    ep.empire_valuation,
    ep.empire_roof_system,
    par.property_type,
    par.building_sqft,
    par.year_built,
    par.roof_age_years,
    par.roof_age_basis,
    par.owner_name,
    -- Check for any subsequent permits on the same parcel AFTER Empire's permit date
    (
      SELECT JSON_AGG(json_build_object(
        'permit_number', sub.raw_permit_number,
        'issue_date', TO_CHAR(sub.issue_date, 'YYYY-MM-DD'),
        'contractor', sub.contractor_name,
        'category', sub.category,
        'description', sub.raw_description,
        'valuation', sub.valuation
      ) ORDER BY sub.issue_date DESC)
      FROM warehouse.normalized_permits sub
      WHERE sub.parcel_id = ep.parcel_id
        AND sub.issue_date > ep.empire_permit_date
    ) as subsequent_activities
  FROM empire_permits ep
  LEFT JOIN warehouse.parcels par 
    ON par.account_number = REPLACE(ep.parcel_id, 'DCAD-PARCEL-', '')
  ORDER BY ep.empire_valuation DESC NULLS LAST;
`;

const res = await client.query(empireParcelsQuery);
console.log(`Found ${res.rows.length} Empire property records. Checking post-Empire activity...`);

let hasSubsequentCount = 0;
for (const row of res.rows) {
  if (row.subsequent_activities && row.subsequent_activities.length > 0) {
    hasSubsequentCount++;
  }
}

console.log(`Properties with activity after Empire: ${hasSubsequentCount} / ${res.rows.length}`);

// Output sample of properties with post-Empire activity and ones without
console.log(JSON.stringify(res.rows.slice(0, 15), null, 2));

await client.end();

