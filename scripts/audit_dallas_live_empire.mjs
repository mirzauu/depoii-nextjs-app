import https from 'https';

async function querySocrata(whereClause, label) {
  const encodedWhere = encodeURIComponent(whereClause);
  const url = `https://www.dallasopendata.com/resource/e7gq-4sah.json?$select=count(*)&$where=${encodedWhere}`;
  
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`[${label}]:`, json[0]?.count || json);
          resolve(json[0]?.count);
        } catch (e) {
          console.log(`[${label}] Error:`, data.slice(0, 150));
          resolve(null);
        }
      });
    }).on('error', err => {
      console.error(err);
      resolve(null);
    });
  });
}

async function runAudit() {
  console.log('--- AUDITING LIVE CITY OF DALLAS OPEN DATA (e7gq-4sah) ---');
  await querySocrata("contractor like '%EMPIRE ROOFING%'", "1. contractor like '%EMPIRE ROOFING%'");
  await querySocrata("contractor like '%EMPIRE%'", "2. contractor like '%EMPIRE%'");
  await querySocrata("contractor like '%MATT%KELLEY%' or contractor like '%MATTHEW%KELLEY%'", "3. Matt / Matthew Kelley");
  await querySocrata("contractor like '%5001%LANCASTER%'", "4. Empire HQ Address (5001 Lancaster)");
  await querySocrata("contractor like '%572-2250%'", "5. Empire Phone (572-2250)");
  await querySocrata("work_description like '%EMPIRE ROOFING%'", "6. work_description like '%EMPIRE ROOFING%'");
}

runAudit();
