import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const targets = [
  { key: 'KPost Company', patterns: ['%kpost%', '%k post%', '%k-post%'] },
  { key: 'Empire Roofing', patterns: ['%empire roof%'] },
  { key: 'Tice Enterprises', patterns: ['%tice%'] },
  { key: 'Texas Roof Management (TRM)', patterns: ['%texas roof manag%', '%trm%'] },
  { key: 'Nations Roof', patterns: ['%nations roof%', '%nationsroof%'] },
  { key: 'Supreme Roofing', patterns: ['%supreme roof%', '%supreme systems%'] },
  { key: 'Castro Roofing of Texas', patterns: ['%castro roof%'] },
  { key: 'CentiMark Corporation', patterns: ['%centimark%'] },
  { key: 'Lon Smith Roofing', patterns: ['%lon smith%'] },
  { key: 'Flynn Group of Companies', patterns: ['%flynn%'] },
  { key: 'Parsons Commercial Roofing', patterns: ['%parsons%'] },
  { key: 'Baker Roofing Company', patterns: ['%baker roof%'] }
];

console.log('--- LATEST ROOF WORK PER COMPETITOR ---');

const summary = [];

for (const t of targets) {
  const conditions = t.patterns.map((_, i) => `contractor_name ILIKE $${i + 1}`).join(' OR ');
  const res = await client.query(`
    SELECT 
      MIN(issue_date) as earliest_work,
      MAX(issue_date) as latest_work,
      COUNT(DISTINCT normalized_address) as buildings_count
    FROM warehouse.normalized_permits
    WHERE ${conditions}
  `, t.patterns);

  const row = res.rows[0];

  // Get the most recent 3 projects
  const recentRes = await client.query(`
    SELECT 
      normalized_address,
      issue_date,
      valuation,
      category,
      raw_description
    FROM warehouse.normalized_permits
    WHERE ${conditions}
    ORDER BY issue_date DESC
    LIMIT 3
  `, t.patterns);

  summary.push({
    company: t.key,
    earliestWork: row.earliest_work,
    latestWork: row.latest_work,
    buildingsCount: row.buildings_count,
    mostRecentProjects: recentRes.rows
  });
}

console.log(JSON.stringify(summary, null, 2));

await client.end();
