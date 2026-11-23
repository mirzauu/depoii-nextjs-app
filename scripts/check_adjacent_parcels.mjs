import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const queries = [
  { label: '1444 N Cockrell Hill Rd', pat: '%1444%COCKRELL%' },
  { label: '4040 Pipestone Rd', pat: '%4040%PIPESTONE%' },
  { label: '3737 Rock Quarry Rd', pat: '%3737%ROCK QUARRY%' },
  { label: '1251 N Cockrell Hill Rd', pat: '%1251%COCKRELL%' },
  { label: '3660 Pipestone Rd', pat: '%3660%PIPESTONE%' },
  { label: '3300 W Mockingbird Ln', pat: '%3300%MOCKINGBIRD%' },
  { label: '5200 Alpha Rd', pat: '%5200%ALPHA%' },
  { label: '4825 Cole Ave', pat: '%4825%COLE%' },
  { label: '1600 S Westmoreland Rd', pat: '%1600%WESTMORELAND%' },
  { label: '4400 Rock Quarry Rd', pat: '%4400%ROCK QUARRY%' }
];

for (const q of queries) {
  const p = await client.query(`
    SELECT account_number, address, building_sqft, year_built, property_type, owner_name, roof_age_years, roof_age_basis, last_reroof_date, last_reroof_permit_no
    FROM warehouse.parcels
    WHERE address ILIKE $1
    LIMIT 1
  `, [q.pat]);
  console.log(q.label, p.rows[0]);
}

await client.end();
