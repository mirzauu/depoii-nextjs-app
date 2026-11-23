import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const res = await client.query(`
  SELECT 
    COUNT(DISTINCT raw_permit_number) as distinct_permit_numbers,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE jurisdiction ILIKE '%Dallas%') as dallas_permits,
    COUNT(*) FILTER (WHERE jurisdiction ILIKE '%Fort Worth%') as fort_worth_permits,
    SUM(COALESCE(valuation, 0)) as total_valuation,
    COUNT(DISTINCT parcel_id) as distinct_properties
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%empire roofing%'
     OR contractor_id IN (SELECT id FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%empire roofing%');
`);

console.log('Empire in our DB right now:', res.rows[0]);

await client.end();

