import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Search the 6,800+ CFW permits already in database for Empire Roofing by contractor, description, or address
const checkCfw = await client.query(`
  SELECT 
    raw_permit_number,
    normalized_address,
    issue_date,
    contractor_name,
    raw_description,
    valuation
  FROM warehouse.normalized_permits
  WHERE source_system = 'CFW_ARCGIS_DEVELOPMENT'
    AND (
      contractor_name ILIKE '%empire%'
      OR raw_description ILIKE '%empire%'
      OR raw_description ILIKE '%5001%lancaster%'
    );
`);

console.log('CFW permits matching Empire:', checkCfw.rows);

// Search TDLR records if any exist in the database
const checkTdlr = await client.query(`
  SELECT COUNT(*) as tdlr_count
  FROM warehouse.normalized_permits
  WHERE tdlr_project_number IS NOT NULL;
`);
console.log('TDLR projects in DB:', checkTdlr.rows[0]);

await client.end();

