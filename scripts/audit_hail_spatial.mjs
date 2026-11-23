import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Load the 31 properties above 5 years old
const agesData = JSON.parse(fs.readFileSync('scripts/empire_48_ages.json', 'utf8'));
const older31 = agesData.properties.filter(p => p.roof_age_years > 5);
const searchPatterns = older31.map(p => `%${p.address.split(',')[0].trim()}%`);

// Spatial proximity check against warehouse.hail_reports (NOAA storm database)
const sql = `
  WITH target_properties AS (
    SELECT 
      par.account_number,
      par.address as property_address,
      par.latitude,
      par.longitude,
      par.roof_age_years,
      par.last_reroof_date
    FROM warehouse.parcels par
    WHERE par.address ILIKE ANY($1)
       OR par.account_number IN (
         SELECT DISTINCT REPLACE(p.parcel_id, 'DCAD-PARCEL-', '')
         FROM warehouse.normalized_permits p
         WHERE p.normalized_address ILIKE ANY($1)
       )
  )
  SELECT 
    tp.account_number,
    tp.property_address,
    tp.roof_age_years,
    tp.last_reroof_date as roof_installed_date,
    hr.storm_date::text as storm_date,
    hr.inches as hail_size_inches,
    hr.city as hail_city,
    hr.remark,
    hr.distance_miles
  FROM target_properties tp
  CROSS JOIN LATERAL (
    SELECT 
      h.storm_date, 
      h.inches, 
      h.city, 
      h.remark,
      ROUND((ST_Distance(
        ST_SetSRID(ST_MakePoint(tp.longitude, tp.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(h.lng, h.lat), 4326)::geography
      ) / 1609.344)::numeric, 2) as distance_miles
    FROM warehouse.hail_reports h
    WHERE (tp.last_reroof_date IS NULL OR h.storm_date::date >= tp.last_reroof_date::date)
      AND h.inches >= 1.0                     -- severe hail (>= 1.0 inch)
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(tp.longitude, tp.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(h.lng, h.lat), 4326)::geography,
        8046.72                               -- within 5.0 miles
      )
    ORDER BY h.inches DESC, h.storm_date DESC
    LIMIT 2
  ) hr
  ORDER BY hr.inches DESC, hr.distance_miles ASC;
`;

const spatialCheck = await client.query(sql, [searchPatterns]);

console.log(`Spatial Hail Matches (>= 1.0" within 5 miles): ${spatialCheck.rows.length}`);
console.log(JSON.stringify(spatialCheck.rows.slice(0, 15), null, 2));

// Save full spatial results
fs.writeFileSync('scripts/empire_older_roofs_hail.json', JSON.stringify(spatialCheck.rows, null, 2));

await client.end();
