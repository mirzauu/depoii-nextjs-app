import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Let's find competitor commercial reroof permits within 1 mile of Empire's recent Dallas jobs!
// Let's see what columns are in warehouse.normalized_permits or warehouse.live_parcels
const res = await client.query(`
  SELECT 
    np.raw_permit_number as competitor_permit,
    np.normalized_address as competitor_address,
    np.contractor_name as competitor_contractor,
    np.valuation as competitor_val,
    np.issue_date as competitor_date,
    np.raw_description as competitor_desc,
    emp.raw_permit_number as empire_permit,
    emp.normalized_address as empire_address,
    emp.issue_date as empire_date
  FROM warehouse.normalized_permits emp
  JOIN warehouse.normalized_permits np 
    ON np.zip_code = emp.zip_code 
    AND np.raw_permit_number != emp.raw_permit_number
    AND np.contractor_name NOT ILIKE '%empire%'
    AND np.contractor_name NOT ILIKE '%claudine cooper%'
    AND (np.raw_description ILIKE '%roof%' OR np.raw_description ILIKE '%tpo%' OR np.raw_description ILIKE '%recover%')
    AND np.issue_date >= '2025-01-01'
    AND emp.issue_date >= '2024-01-01'
    AND emp.contractor_name ILIKE '%empire%'
  ORDER BY np.issue_date DESC
  LIMIT 20;
`);

console.log('--- COMPETITOR ROOF PERMITS SAME ZIP CODE AS EMPIRE JOBS ---');
for (const r of res.rows) {
  console.log(`Competitor: [${r.competitor_contractor}] permit ${r.competitor_permit} on ${r.competitor_address} ($${r.competitor_val}, ${r.competitor_date?.toISOString()?.slice(0,10)})`);
  console.log(`   Near Empire job: ${r.empire_permit} at ${r.empire_address} (${r.empire_date?.toISOString()?.slice(0,10)})`);
  console.log(`   Desc: ${r.competitor_desc?.slice(0, 100)}\n`);
}

await client.end();

