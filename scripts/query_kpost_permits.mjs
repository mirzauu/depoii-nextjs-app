import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check canonical entities for KPost / K Post
const canonical = await client.query(`
  SELECT id, canonical_name, headquarters_city, phone_number, total_permits, total_valuation, rcat_license_number, bbb_rating
  FROM warehouse.canonical_contractors
  WHERE canonical_name ILIKE '%kpost%' OR canonical_name ILIKE '%k post%'
`);
console.log('Canonical Records for KPost:', canonical.rows);

// 2. Query all permits in normalized_permits matching KPost variations
const stats = await client.query(`
  SELECT 
    contractor_name,
    jurisdiction,
    COUNT(*) as permit_count,
    COUNT(DISTINCT parcel_id) as distinct_parcels,
    SUM(COALESCE(valuation, 0)) as total_val,
    MIN(issue_date) as earliest,
    MAX(issue_date) as latest
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%kpost%' 
     OR contractor_name ILIKE '%k post%'
     OR contractor_id IN (
       SELECT id FROM warehouse.canonical_contractors 
       WHERE canonical_name ILIKE '%kpost%' OR canonical_name ILIKE '%k post%'
     )
  GROUP BY contractor_name, jurisdiction
  ORDER BY permit_count DESC;
`);
console.log('Permit breakdown by name & jurisdiction:');
console.log(JSON.stringify(stats.rows, null, 2));

// 3. Combined total stats
const totalStats = await client.query(`
  SELECT 
    COUNT(DISTINCT raw_permit_number) as distinct_permit_numbers,
    COUNT(*) as total_rows,
    COUNT(DISTINCT parcel_id) as distinct_properties,
    SUM(COALESCE(valuation, 0)) as total_valuation,
    MIN(issue_date) as earliest_permit,
    MAX(issue_date) as latest_permit
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%kpost%' 
     OR contractor_name ILIKE '%k post%'
     OR contractor_id IN (
       SELECT id FROM warehouse.canonical_contractors 
       WHERE canonical_name ILIKE '%kpost%' OR canonical_name ILIKE '%k post%'
     );
`);
console.log('Total KPost combined stats:', totalStats.rows[0]);

await client.end();

