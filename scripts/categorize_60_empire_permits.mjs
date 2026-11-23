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
      const socrataList = JSON.parse(data);
      console.log(`Fetched ${socrataList.length} permits from Dallas Socrata.`);
      
      // Categorize the 60 permits by permit_type and work_description
      const breakdown = {};
      const items = [];
      
      for (const p of socrataList) {
        const type = p.permit_type || 'Unspecified';
        breakdown[type] = (breakdown[type] || 0) + 1;
        items.push({
          permit_number: p.permit_number,
          issued_date: p.issued_date,
          permit_type: p.permit_type,
          address: p.street_address,
          value: p.value,
          description: p.work_description
        });
      }
      
      console.log('--- BREAKDOWN OF ALL 60 DALLAS PERMITS BY TYPE ---');
      console.log(JSON.stringify(breakdown, null, 2));
      
      console.log('\n--- SAMPLE OF EACH PERMIT TYPE ---');
      const seen = new Set();
      for (const it of items) {
        if (!seen.has(it.permit_type)) {
          seen.add(it.permit_type);
          console.log(`[Type: ${it.permit_type}] Perm#: ${it.permit_number} | Addr: ${it.address} | Val: $${it.value} | Desc: ${it.description}`);
        }
      }
      
      await client.end();
    } catch (e) {
      console.error(e);
      await client.end();
    }
  });
}).on('error', console.error);

