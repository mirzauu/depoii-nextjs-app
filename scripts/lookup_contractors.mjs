import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const queries = [
  { name: 'Empire Roofing', pattern: '%empire%' },
  { name: 'KPost Company', pattern: '%kpost%' },
  { name: 'Lon Smith Roofing', pattern: '%lon smith%' },
  { name: 'Supreme Roofing', pattern: '%supreme%' },
  { name: 'Chamberlin Roofing', pattern: '%chamberlin%' },
  { name: 'Texas Roof Management', pattern: '%texas roof%' },
  { name: 'Parsons Commercial Roofing', pattern: '%parsons%' },
  { name: 'Castro Roofing', pattern: '%castro%' },
  { name: 'Tice Enterprises', pattern: '%tice%' },
  { name: 'CentiMark', pattern: '%centimark%' }
];

for (const q of queries) {
  const res = await client.query(`
    SELECT canonical_name, total_permits, total_valuation, headquarters_city 
    FROM warehouse.canonical_contractors 
    WHERE canonical_name ILIKE $1 
    ORDER BY total_permits DESC LIMIT 3
  `, [q.pattern]);
  console.log(`=== ${q.name} ===`);
  console.log(res.rows);
}

await client.end();

