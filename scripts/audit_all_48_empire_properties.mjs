import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Query all 48 Dallas permits pulled by Empire Roofing, linking DCAD parcel details and checking for subsequent roof work
const query = `
  WITH empire_dallas AS (
    SELECT 
      p.id as permit_id,
      p.raw_permit_number as empire_permit_number,
      p.normalized_address,
      p.parcel_id,
      p.issue_date as empire_issue_date,
      p.valuation as empire_valuation,
      p.probable_roof_system as empire_roof_system,
      p.raw_description as empire_description
    FROM warehouse.normalized_permits p
    WHERE (p.contractor_name ILIKE '%empire roofing%' OR p.contractor_id IN (SELECT id FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%empire roofing%'))
      AND p.jurisdiction ILIKE '%Dallas%'
  )
  SELECT 
    ed.empire_permit_number,
    ed.normalized_address,
    TO_CHAR(ed.empire_issue_date, 'YYYY-MM-DD') as empire_work_date,
    ed.empire_valuation,
    COALESCE(ed.empire_roof_system, 'Commercial Low-Slope / Flat') as roof_system,
    par.property_type,
    par.building_sqft,
    par.owner_name,
    -- Check for any subsequent ROOFING permit on this parcel or address after Empire's issue date
    (
      SELECT JSON_AGG(json_build_object(
        'permit_number', sub.raw_permit_number,
        'issue_date', TO_CHAR(sub.issue_date, 'YYYY-MM-DD'),
        'contractor', sub.contractor_name,
        'valuation', sub.valuation,
        'description', sub.raw_description
      ) ORDER BY sub.issue_date ASC)
      FROM warehouse.normalized_permits sub
      WHERE (
        (ed.parcel_id IS NOT NULL AND sub.parcel_id = ed.parcel_id)
        OR (ed.normalized_address IS NOT NULL AND sub.normalized_address = ed.normalized_address)
      )
      AND sub.issue_date > ed.empire_issue_date
      AND (
        sub.category ILIKE '%roof%' 
        OR sub.raw_description ILIKE '%roof%' 
        OR sub.contractor_name ILIKE '%roof%'
        OR sub.is_pure_reroof = true
      )
    ) as subsequent_roof_work
  FROM empire_dallas ed
  LEFT JOIN warehouse.parcels par 
    ON par.account_number = REPLACE(ed.parcel_id, 'DCAD-PARCEL-', '')
  ORDER BY ed.empire_issue_date DESC NULLS LAST;
`;

const res = await client.query(query);
console.log(`Audited ${res.rows.length} properties.`);

// Separate into with subsequent roof work vs none
const withSub = [];
const withoutSub = [];

for (const row of res.rows) {
  if (row.subsequent_roof_work && row.subsequent_roof_work.length > 0) {
    withSub.push(row);
  } else {
    withoutSub.push(row);
  }
}

console.log(`With subsequent roof work: ${withSub.length}`);
console.log(`Without subsequent roof work: ${withoutSub.length}`);

console.log('\n--- SAMPLE WITH SUBSEQUENT ROOF WORK ---');
console.log(JSON.stringify(withSub, null, 2));

// Save full 48 list to JSON for building the markdown table
import fs from 'fs';
fs.writeFileSync('scripts/empire_48_full_audit.json', JSON.stringify(res.rows, null, 2));

await client.end();

