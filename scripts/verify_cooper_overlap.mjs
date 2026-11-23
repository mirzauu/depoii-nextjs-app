import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Let's verify Claudine Cooper on all three permits:
// - COM-ROOF-25-000088 (Sept 2025, 3500 Manor Way)
// - COM-ROOF-26-000213 (Sept 2026, 3500 Manor Way)
// - COM-ROOF-26-000062 (March 2026, 3615 Pipestone Rd)

const p3 = await client.query(`
  SELECT 
    raw_permit_number, issue_date, contractor_name, contractor_phone, valuation, square_footage, normalized_address, raw_description
  FROM warehouse.normalized_permits
  WHERE raw_permit_number IN ('COM-ROOF-25-000088', 'COM-ROOF-26-000213', 'COM-ROOF-26-000062')
  ORDER BY issue_date ASC
`);

console.log('--- 3 CONFIRMED CLAUDINE COOPER PERMITS ---');
console.log(JSON.stringify(p3.rows, null, 2));

// 2. Let's find EVERY permit where contractor_name ILIKE '%Claudine Cooper%'
const allCooper = await client.query(`
  SELECT 
    raw_permit_number, issue_date, contractor_name, valuation, square_footage, normalized_address, raw_description, parcel_id
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%Claudine Cooper%'
  ORDER BY issue_date DESC
`);

console.log(`\n--- ALL CLAUDINE COOPER PERMITS (${allCooper.rows.length}) ---`);
console.log(JSON.stringify(allCooper.rows, null, 2));

// 3. Let's find where Empire worked (past client addresses or streets) and check if Claudine Cooper or KPost or any major competitor pulled a permit on that SAME parcel or adjacent!
const empireParcels = await client.query(`
  SELECT DISTINCT parcel_id, normalized_address
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%empire roofing%'
`);

console.log(`\nEmpire has touched ${empireParcels.rows.length} unique parcels.`);

// Check if Claudine Cooper pulled permits on any of Empire's parcels or nearby streets
const cooperPermits = allCooper.rows;
for (const cp of cooperPermits) {
  // check if parcel matches empire
  const matchParcel = empireParcels.rows.find(ep => ep.parcel_id === cp.parcel_id);
  if (matchParcel) {
    console.log(`[EXACT PARCEL OVERLAP] Cooper permit ${cp.raw_permit_number} on Empire parcel ${cp.parcel_id} (${cp.normalized_address})`);
  }
}

await client.end();

