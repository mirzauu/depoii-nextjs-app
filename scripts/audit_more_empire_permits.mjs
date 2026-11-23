import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Broad fuzzy check in normalized_permits for any variation of Empire or their key executives/licenses
const queryPermits = `
  SELECT 
    contractor_name,
    jurisdiction,
    COUNT(*) as permit_count,
    MIN(issue_date) as earliest,
    MAX(issue_date) as latest,
    SUM(valuation) as total_val
  FROM warehouse.normalized_permits
  WHERE contractor_name ILIKE '%empire%'
     OR contractor_name ILIKE '%matt%kelley%'
     OR contractor_name ILIKE '%matthew%kelley%'
     OR contractor_license IN ('03-0019', '03-0035', '02-0656')
     OR raw_description ILIKE '%empire roofing%'
  GROUP BY contractor_name, jurisdiction
  ORDER BY permit_count DESC;
`;

const res1 = await client.query(queryPermits);
console.log('Permits match breakdown in DB:');
console.log(JSON.stringify(res1.rows, null, 2));

await client.end();

