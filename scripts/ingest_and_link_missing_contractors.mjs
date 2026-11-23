import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

console.log('--- Step 1: Identifying Missing Contractors from Dallas Roofing Permits ---');

// 1. Identify distinct contractors from roofing permits that are missing from canonical_contractors
const missingQuery = `
  WITH permit_roofers AS (
    SELECT 
      contractor_name,
      COUNT(*) as permit_count,
      SUM(COALESCE(valuation, 0)) as total_valuation,
      MAX(contractor_license) as sample_license,
      MAX(contractor_phone) as sample_phone,
      MAX(probable_roof_system) as sample_roof_system
    FROM warehouse.normalized_permits
    WHERE jurisdiction ILIKE '%Dallas%'
      AND contractor_name IS NOT NULL
      AND contractor_name NOT IN ('On Municipal Record', ', ,   ()', 'Licensed Commercial Contractor', 'UNKNOWN', 'N/A')
      AND (
        is_pure_reroof = true 
        OR category ILIKE '%roof%' 
        OR raw_description ILIKE '%roof%' 
        OR contractor_name ILIKE '%roof%'
      )
    GROUP BY contractor_name
  )
  SELECT 
    pr.contractor_name,
    pr.permit_count,
    pr.total_valuation,
    pr.sample_license,
    pr.sample_phone,
    pr.sample_roof_system
  FROM permit_roofers pr
  LEFT JOIN warehouse.canonical_contractors c 
    ON LOWER(TRIM(pr.contractor_name)) = LOWER(TRIM(c.canonical_name))
  WHERE c.id IS NULL;
`;

const missing = await client.query(missingQuery);
console.log(`Found ${missing.rows.length} contractors to ingest into warehouse.canonical_contractors.`);

let insertedCount = 0;
const now = new Date().toISOString();

for (const row of missing.rows) {
  const rawName = row.contractor_name.trim();
  const id = 'cont_' + crypto.createHash('md5').update(rawName.toLowerCase()).digest('hex').substring(0, 16);
  
  // Clean phone if exists
  const phone = row.sample_phone ? row.sample_phone.replace(/[^0-9]/g, '') : null;
  const formattedPhone = phone && phone.length === 10 ? `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}` : row.sample_phone;

  const insertSql = `
    INSERT INTO warehouse.canonical_contractors (
      id,
      canonical_name,
      primary_license,
      headquarters_city,
      headquarters_state,
      total_permits,
      total_valuation,
      primary_roof_system,
      phone_number,
      enrichment_status,
      enrichment_updated_at,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (id) DO UPDATE SET
      total_permits = EXCLUDED.total_permits,
      total_valuation = EXCLUDED.total_valuation,
      updated_at = EXCLUDED.updated_at;
  `;

  await client.query(insertSql, [
    id,
    rawName,
    row.sample_license || null,
    'Dallas',
    'TX',
    parseInt(row.permit_count),
    parseFloat(row.total_valuation) || 0,
    row.sample_roof_system || (rawName.toLowerCase().includes('roof') ? 'Commercial Roofing' : 'Commercial Contracting'),
    formattedPhone || null,
    'ingested_from_municipal_permits',
    now,
    now,
    now
  ]);
  insertedCount++;
}

console.log(`Successfully ingested and synchronized ${insertedCount} contractors into warehouse.canonical_contractors.`);

// --- Step 2: Link warehouse.normalized_permits.contractor_id to warehouse.canonical_contractors.id ---
console.log('--- Step 2: Linking Permit Records to Canonical Contractor IDs ---');
const linkSql = `
  UPDATE warehouse.normalized_permits p
  SET contractor_id = c.id
  FROM warehouse.canonical_contractors c
  WHERE LOWER(TRIM(p.contractor_name)) = LOWER(TRIM(c.canonical_name))
    AND (p.contractor_id IS NULL OR p.contractor_id != c.id)
    AND p.jurisdiction ILIKE '%Dallas%';
`;

const linkRes = await client.query(linkSql);
console.log(`Updated contractor_id on ${linkRes.rowCount} Dallas permit records.`);

// --- Step 3: Recalculate Aggregate Stats on all Canonical Contractors with Dallas Permits ---
console.log('--- Step 3: Recalculating Lifetime Aggregate Permit Volume & Valuations ---');
const rollupSql = `
  WITH stats AS (
    SELECT 
      contractor_id,
      COUNT(*) as live_permit_count,
      SUM(COALESCE(valuation, 0)) as live_valuation
    FROM warehouse.normalized_permits
    WHERE contractor_id IS NOT NULL
    GROUP BY contractor_id
  )
  UPDATE warehouse.canonical_contractors c
  SET 
    total_permits = stats.live_permit_count,
    total_valuation = stats.live_valuation,
    updated_at = NOW()::text
  FROM stats
  WHERE c.id = stats.contractor_id;
`;

const rollupRes = await client.query(rollupSql);
console.log(`Synchronized lifetime permit stats across ${rollupRes.rowCount} canonical contractor profiles.`);

// --- Step 4: Verification of 100% Coverage ---
const verifySql = `
  WITH permit_roofers AS (
    SELECT DISTINCT contractor_name
    FROM warehouse.normalized_permits
    WHERE jurisdiction ILIKE '%Dallas%'
      AND contractor_name IS NOT NULL
      AND contractor_name NOT IN ('On Municipal Record', ', ,   ()', 'Licensed Commercial Contractor', 'UNKNOWN', 'N/A')
      AND (
        is_pure_reroof = true 
        OR category ILIKE '%roof%' 
        OR raw_description ILIKE '%roof%' 
        OR contractor_name ILIKE '%roof%'
      )
  )
  SELECT 
    COUNT(*) as total_permit_roofers,
    COUNT(c.id) as matched_in_canonical,
    COUNT(*) - COUNT(c.id) as remaining_missing
  FROM permit_roofers pr
  LEFT JOIN warehouse.canonical_contractors c 
    ON LOWER(TRIM(pr.contractor_name)) = LOWER(TRIM(c.canonical_name));
`;

const verifyRes = await client.query(verifySql);
console.log('Final Verification:', verifyRes.rows[0]);

await client.end();

