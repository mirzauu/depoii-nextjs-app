import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Check permit 1906281171 at 4038 Rock Quarry Rd
const kpostJob = await client.query(`
  SELECT 
    raw_permit_number, issue_date, applied_date, contractor_name, valuation, square_footage, normalized_address, raw_description
  FROM warehouse.normalized_permits
  WHERE raw_permit_number = '1906281171' OR (normalized_address ILIKE '%4038 ROCK QUARRY%' AND raw_description ILIKE '%roof%')
`);

console.log('KPost Permit Details:');
console.log(kpostJob.rows);

// 2. Check DCAD Parcel data for 4038, 4105, and 3737 Rock Quarry Rd
const parcels = await client.query(`
  SELECT 
    account_number, address, city, property_type, building_sqft, year_built, roof_age_years, roof_age_basis, owner_name, total_valuation
  FROM warehouse.parcels
  WHERE address ILIKE '%ROCK QUARRY%' AND (address ILIKE '%4038%' OR address ILIKE '%4105%' OR address ILIKE '%3737%')
  ORDER BY address ASC
`);

console.log('\nParcels Details:');
console.log(parcels.rows);

await client.end();

