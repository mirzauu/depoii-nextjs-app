import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Inspect hail / storm tables in warehouse or public schema
const stormTables = await client.query(`
  SELECT table_schema, table_name 
  FROM information_schema.tables 
  WHERE table_name ILIKE '%hail%' OR table_name ILIKE '%storm%' OR table_name ILIKE '%lead%';
`);
console.log('Storm/Lead Tables in DB:', stormTables.rows);

// Load the 31 properties above 5 years old
const agesData = JSON.parse(fs.readFileSync('scripts/empire_48_ages.json', 'utf8'));
const older31 = agesData.properties.filter(p => p.roof_age_years > 5);

console.log(`Auditing hail events for ${older31.length} properties...`);

// Check if warehouse.scored_parcel_leads or warehouse.hail_events has records for these addresses/accounts
const checkLeads = await client.query(`
  SELECT 
    spl.account_number,
    spl.property_address,
    spl.storm_date,
    spl.max_hail_size_inches,
    spl.composite_lead_score,
    spl.priority_tier
  FROM warehouse.scored_parcel_leads spl
  WHERE spl.property_address ILIKE ANY($1);
`, [older31.map(p => `%${p.address.split(',')[0]}%`)]);

console.log('Matches in scored_parcel_leads:', checkLeads.rows.length);
console.log(checkLeads.rows);

// Also check raw storm tables if they exist
const rawStorms = await client.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'hail_events' OR table_name = 'noaa_storm_events' OR table_name = 'storms';
`);
console.log('Storm Columns:', rawStorms.rows);

await client.end();

