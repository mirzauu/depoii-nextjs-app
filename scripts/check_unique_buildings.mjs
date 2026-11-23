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
  { key: 'Baker Roofing Company', patterns: ['%baker roof%'] },
  { key: 'Chamberlin Roofing & Waterproofing', patterns: ['%chamberlin%'] }
];

console.log('--- CHECKING UNIQUE BUILDINGS PER COMPANY ---');

const results = [];

for (const t of targets) {
  // Build OR condition for patterns
  const conditions = t.patterns.map((_, i) => `contractor_name ILIKE $${i + 1}`).join(' OR ');
  
  // Also get contractor IDs
  const cRes = await client.query(
    `SELECT id FROM warehouse.canonical_contractors WHERE ${t.patterns.map((_, i) => `canonical_name ILIKE $${i + 1}`).join(' OR ')}`,
    t.patterns
  );
  const cIds = cRes.rows.map(r => String(r.id));

  let query = '';
  let params = [];

  if (cIds.length > 0) {
    query = `
      SELECT 
        COUNT(*) as total_permits,
        COUNT(DISTINCT normalized_address) as unique_addresses,
        COUNT(DISTINCT parcel_id) FILTER (WHERE parcel_id IS NOT NULL) as unique_parcels,
        COUNT(DISTINCT CASE 
          WHEN parcel_id IS NOT NULL THEN parcel_id::text 
          ELSE normalized_address 
        END) as unique_buildings_hybrid,
        COALESCE(SUM(valuation), 0) as total_valuation
      FROM warehouse.normalized_permits
      WHERE (${conditions}) OR contractor_id::text = ANY($${t.patterns.length + 1}::text[])
    `;
    params = [...t.patterns, cIds];
  } else {
    query = `
      SELECT 
        COUNT(*) as total_permits,
        COUNT(DISTINCT normalized_address) as unique_addresses,
        COUNT(DISTINCT parcel_id) FILTER (WHERE parcel_id IS NOT NULL) as unique_parcels,
        COUNT(DISTINCT CASE 
          WHEN parcel_id IS NOT NULL THEN parcel_id::text 
          ELSE normalized_address 
        END) as unique_buildings_hybrid,
        COALESCE(SUM(valuation), 0) as total_valuation
      FROM warehouse.normalized_permits
      WHERE ${conditions}
    `;
    params = t.patterns;
  }

  const res = await client.query(query, params);
  const row = res.rows[0];

  results.push({
    company: t.key,
    totalPermits: parseInt(row.total_permits, 10),
    uniqueAddresses: parseInt(row.unique_addresses, 10),
    uniqueParcels: parseInt(row.unique_parcels, 10),
    uniqueBuildings: parseInt(row.unique_buildings_hybrid, 10),
    totalValuation: parseFloat(row.total_valuation)
  });
}

// Special check for Claudine Cooper (Empire Roofing internal permit filer)
const cooperRes = await client.query(`
  SELECT 
    COUNT(*) as total_permits,
    COUNT(DISTINCT normalized_address) as unique_addresses,
    COUNT(DISTINCT parcel_id) FILTER (WHERE parcel_id IS NOT NULL) as unique_parcels,
    COUNT(DISTINCT CASE 
      WHEN parcel_id IS NOT NULL THEN parcel_id::text 
      ELSE normalized_address 
    END) as unique_buildings_hybrid,
    COALESCE(SUM(valuation), 0) as total_valuation
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%claudine cooper%'
`);
const cRow = cooperRes.rows[0];
results.push({
  company: 'Claudine Cooper (Empire Roofing Internal Filer)',
  totalPermits: parseInt(cRow.total_permits, 10),
  uniqueAddresses: parseInt(cRow.unique_addresses, 10),
  uniqueParcels: parseInt(cRow.unique_parcels, 10),
  uniqueBuildings: parseInt(cRow.unique_buildings_hybrid, 10),
  totalValuation: parseFloat(cRow.total_valuation)
});

console.log(JSON.stringify(results, null, 2));

await client.end();
