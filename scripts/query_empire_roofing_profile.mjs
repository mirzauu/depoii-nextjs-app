import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Join DCAD account numbers directly with warehouse.parcels (stripping DCAD-PARCEL- prefix)
const properties = await client.query(`
  SELECT 
    p.raw_permit_number,
    p.parcel_id,
    p.normalized_address,
    p.jurisdiction,
    TO_CHAR(p.issue_date, 'YYYY-MM-DD') as issue_date,
    p.valuation,
    p.probable_roof_system,
    par.property_type,
    par.building_sqft,
    par.year_built,
    par.roof_age_years,
    par.owner_name
  FROM warehouse.normalized_permits p
  LEFT JOIN warehouse.parcels par 
    ON par.account_number = REPLACE(p.parcel_id, 'DCAD-PARCEL-', '')
  WHERE p.contractor_name ILIKE '%empire roofing%'
     OR p.contractor_id IN (SELECT id FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%empire roofing%')
  ORDER BY p.valuation DESC NULLS LAST
  LIMIT 10;
`);

console.log(JSON.stringify(properties.rows, null, 2));

await client.end();
