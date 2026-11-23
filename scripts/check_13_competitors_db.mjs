import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

const targets = [
  { key: 'KPost Company', patterns: ['%kpost%', '%k post%', '%k-post%'] },
  { key: 'CentiMark Corporation', patterns: ['%centimark%'] },
  { key: 'Chamberlin Roofing & Waterproofing', patterns: ['%chamberlin%'] },
  { key: 'Nations Roof', patterns: ['%nations roof%', '%nationsroof%'] },
  { key: 'Flynn Group of Companies', patterns: ['%flynn%'] },
  { key: 'Supreme Roofing', patterns: ['%supreme roof%', '%supreme systems%'] },
  { key: 'Texas Roof Management (TRM)', patterns: ['%texas roof manag%', '%trm%'] },
  { key: 'Lon Smith Roofing', patterns: ['%lon smith%'] },
  { key: 'Parsons Commercial Roofing', patterns: ['%parsons%'] },
  { key: 'Baker Roofing Company', patterns: ['%baker roof%'] },
  { key: 'Castro Roofing of Texas', patterns: ['%castro roof%'] },
  { key: 'Tice Enterprises', patterns: ['%tice%'] },
  { key: 'Empire Roofing', patterns: ['%empire roof%'] }
];

console.log('--- CHECKING 13 COMPETITORS IN DB ---');

const results = [];

for (const t of targets) {
  let matchedContractors = [];
  let totalPermits = 0;
  let totalVal = 0;

  for (const pat of t.patterns) {
    const cRes = await client.query(
      `SELECT id, canonical_name, phone_number, primary_license 
       FROM warehouse.canonical_contractors 
       WHERE canonical_name ILIKE $1`,
      [pat]
    );
    for (const row of cRes.rows) {
      if (!matchedContractors.some(m => m.id === row.id)) {
        matchedContractors.push(row);
      }
    }

    const pRes = await client.query(
      `SELECT count(*) as count, COALESCE(sum(valuation), 0) as val 
       FROM warehouse.normalized_permits 
       WHERE contractor_name ILIKE $1`,
      [pat]
    );
    totalPermits += parseInt(pRes.rows[0].count, 10);
    totalVal += parseFloat(pRes.rows[0].val);
  }

  if (matchedContractors.length > 0) {
    const ids = matchedContractors.map(c => String(c.id));
    const pById = await client.query(
      `SELECT count(*) as count, COALESCE(sum(valuation), 0) as val 
       FROM warehouse.normalized_permits 
       WHERE contractor_id::text = ANY($1::text[])`,
      [ids]
    );
    const countById = parseInt(pById.rows[0].count, 10);
    const valById = parseFloat(pById.rows[0].val);
    if (countById > totalPermits) {
      totalPermits = countById;
      totalVal = valById;
    }
  }

  results.push({
    name: t.key,
    foundInDB: matchedContractors.length > 0 || totalPermits > 0,
    contractorsCount: matchedContractors.length,
    contractorNames: matchedContractors.map(c => c.canonical_name),
    permitCount: totalPermits,
    totalValuation: totalVal
  });
}

console.log(JSON.stringify(results, null, 2));

await client.end();
