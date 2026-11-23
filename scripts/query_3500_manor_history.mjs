import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check matching permits for 3500 MANOR WAY
const permits = await client.query(`
  SELECT 
    raw_permit_number,
    parcel_id,
    normalized_address,
    TO_CHAR(issue_date, 'YYYY-MM-DD') as issue_date,
    category,
    permit_scope,
    valuation,
    contractor_name,
    probable_roof_system,
    raw_description
  FROM warehouse.normalized_permits
  WHERE normalized_address ILIKE '%3500%MANOR%'
  ORDER BY issue_date ASC NULLS LAST;
`);

console.log('Permit History Count:', permits.rows.length);
console.log('Permits:', JSON.stringify(permits.rows, null, 2));

if (permits.rows.length > 0 && permits.rows[0].parcel_id) {
  const parcelIdClean = permits.rows[0].parcel_id.replace('DCAD-PARCEL-', '');
  const parcelInfo = await client.query(`
    SELECT *
    FROM warehouse.parcels
    WHERE account_number = $1
  `, [parcelIdClean]);
  console.log('Parcel Info:', JSON.stringify(parcelInfo.rows, null, 2));
}

await client.end();
