import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// Query adjacent / prime reroof commercial properties in the exact same industrial corridors as Empire's jobs
// e.g., Bastille Rd, Pipestone Rd, Rock Quarry Rd, Bronze Way, Regal Row, Manor Way, etc.
const qAdjacentOpportunities = await client.query(`
  SELECT 
    par.account_number,
    par.address,
    par.city,
    par.property_type,
    par.building_sqft,
    par.year_built,
    par.roof_age_years,
    par.roof_age_basis,
    par.owner_name,
    par.total_valuation
  FROM warehouse.parcels par
  WHERE (
    par.address ILIKE '%ROCK QUARRY%' 
    OR par.address ILIKE '%PIPESTONE%' 
    OR par.address ILIKE '%REGAL ROW%' 
    OR par.address ILIKE '%BRONZE WAY%'
    OR par.address ILIKE '%LA REUNION%'
    OR par.address ILIKE '%BASTILLE%'
    OR par.address ILIKE '%MANOR WAY%'
  )
  AND par.building_sqft >= 30000
  AND par.roof_age_years >= 18
  ORDER BY par.building_sqft DESC
  LIMIT 15;
`);

console.log('Adjacent Heavyweight Commercial Candidates (18+ yrs old, same streets as Empire):');
console.log(JSON.stringify(qAdjacentOpportunities.rows, null, 2));

// Also check scored_parcel_leads or hail on these parcels if any
const parcelIds = qAdjacentOpportunities.rows.map(r => 'DCAD-PARCEL-' + r.account_number);
const qHail = await client.query(`
  SELECT parcel_id, address, max_hail_inches, last_hail_date, roof_age_years, reroof_priority_score
  FROM warehouse.scored_parcel_leads
  WHERE parcel_id = ANY($1)
`, [parcelIds]);

console.log('\nHail / Lead Scores for Candidates:');
console.log(JSON.stringify(qHail.rows, null, 2));

await client.end();
