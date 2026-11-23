import https from 'https';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();

// 1. Fetch all 60 permits from Socrata
const url = "https://www.dallasopendata.com/resource/e7gq-4sah.json?$where=contractor%20like%20'%25EMPIRE%20ROOFING%25'&$limit=100";

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    try {
      const livePermits = JSON.parse(data);
      console.log(`Fetched ${livePermits.length} permits from Dallas Open Data API.`);
      
      const livePermitNumbers = livePermits.map(p => p.permit_number.trim());
      
      // Check which ones already exist in warehouse.normalized_permits
      const checkDb = await client.query(`
        SELECT raw_permit_number 
        FROM warehouse.normalized_permits
        WHERE raw_permit_number = ANY($1);
      `, [livePermitNumbers]);
      
      const existingInDb = new Set(checkDb.rows.map(r => r.raw_permit_number));
      console.log(`Already in our DB: ${existingInDb.size} / ${livePermits.length}`);
      
      const missingFromDb = livePermits.filter(p => !existingInDb.has(p.permit_number.trim()));
      console.log(`New permits available to ingest: ${missingFromDb.length}`);
      
      if (missingFromDb.length > 0) {
        console.log('Sample of new permits found in Dallas Open Data:');
        for (const m of missingFromDb.slice(0, 5)) {
          console.log(`- [${m.permit_number}] ${m.street_address} (Issued: ${m.issued_date}) - Val: $${m.value} - Desc: ${m.work_description}`);
        }
      }
      
      await client.end();
    } catch (e) {
      console.error(e);
      await client.end();
    }
  });
}).on('error', console.error);

