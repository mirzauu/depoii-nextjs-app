import pg from 'pg';
import https from 'https';
import querystring from 'querystring';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://aca-prod.accela.com/dallastx/Cap/CapHome.aspx?module=Building&TabName=Building';
const BATCH_SIZE = 25;
const MIN_DELAY_MS = 2500;
const MAX_DELAY_MS = 3800;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay() {
  const ms = Math.floor(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
  return sleep(ms);
}

function parseAddress(fullAddress) {
  if (!fullAddress) return null;
  const cleaned = fullAddress.trim().replace(/,/g, ' ');
  const m = cleaned.match(/^(\d+)\s+(.+)$/);
  if (!m) return null;
  const num = m[1];
  const words = m[2].trim().split(/\s+/);
  let street = words[0];
  if (['N', 'S', 'E', 'W', 'NORTH', 'SOUTH', 'EAST', 'WEST'].includes(street.toUpperCase()) && words.length > 1) {
    street = words[1];
  }
  return { num, street: street.replace(/[^a-zA-Z0-9]/g, '') };
}

function extractForm(html) {
  const fields = {};
  const re = /<input[^>]+name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) fields[m[1]] = m[2];
  const re2 = /<input[^>]+value="([^"]*)"[^>]*name="([^"]+)"[^>]*>/gi;
  while ((m = re2.exec(html)) !== null) if (!fields[m[2]]) fields[m[2]] = m[1];
  return fields;
}

function fetchWithRedirect(url, headers = {}, postData = null, cookie = '') {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: postData ? 'POST' : 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...headers,
      },
    };
    if (cookie) opts.headers['Cookie'] = cookie;
    if (postData) {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const setCookies = res.headers['set-cookie'] || [];
        const newCookies = setCookies.map((c) => c.split(';')[0]).join('; ');
        const mergedCookie = [cookie, newCookies].filter(Boolean).join('; ');

        // Check rate limit header
        const retryAfter = res.headers['retry-after'] ? parseInt(res.headers['retry-after'], 10) : null;

        if (res.statusCode === 429) {
          return resolve({ statusCode: 429, retryAfter: retryAfter || 180, cookie: mergedCookie, body: data });
        }

        // Follow 301 / 302 redirects for GET requests or when getting initial page
        if (!postData && (res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          const nextUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : `https://${u.hostname}${res.headers.location}`;
          return resolve(fetchWithRedirect(nextUrl, headers, null, mergedCookie));
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          cookie: mergedCookie,
          body: data,
          location: res.headers.location || '',
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    if (postData) req.write(postData);
    req.end();
  });
}

async function lookupAccelaRecord(num, street, permitNumber = null) {
  try {
    const initPage = await fetchWithRedirect(BASE_URL);
    if (initPage.statusCode === 429) {
      return { status: 'rate_limit', retryAfter: initPage.retryAfter || 180 };
    }
    if (initPage.body.includes('Scheduled Maintenance') || initPage.body.includes('site-status" content="maintenante"')) {
      return { status: 'maintenance' };
    }
    if (initPage.statusCode !== 200 || !initPage.body) {
      return { status: 'retry' };
    }

    const fields = extractForm(initPage.body);

    if (permitNumber && permitNumber.length >= 8) {
      fields['ctl00$PlaceHolderMain$generalSearchForm$txtGSPermitNumber'] = permitNumber;
    } else if (num && street) {
      fields['ctl00$PlaceHolderMain$generalSearchForm$txtGSNumber$ChildControl0'] = num;
      fields['ctl00$PlaceHolderMain$generalSearchForm$txtGSStreetName'] = street;
    } else {
      return { status: 'invalid' };
    }

    fields['ctl00$PlaceHolderMain$btnNewSearch'] = 'Search';
    delete fields['ctl00$PlaceHolderMain$btnResetSearch'];

    const postData = querystring.stringify(fields);
    const searchRes = await fetchWithRedirect(BASE_URL, { Referer: BASE_URL }, postData, initPage.cookie);

    if (searchRes.statusCode === 429) {
      return { status: 'rate_limit', retryAfter: searchRes.retryAfter || 180 };
    }

    let targetPath = null;
    if ((searchRes.statusCode === 302 || searchRes.statusCode === 301) && searchRes.location) {
      targetPath = searchRes.location;
    } else if (searchRes.statusCode === 200) {
      const reLink = /href="([^"]*(?:CapDetail)[^"]*)"/i;
      const m = reLink.exec(searchRes.body);
      if (m) targetPath = m[1].replace(/&amp;/g, '&');
    }

    if (!targetPath || !targetPath.includes('CapDetail')) {
      return { status: 'invalid' };
    }

    const fullUrl = targetPath.startsWith('http')
      ? targetPath
      : `https://aca-prod.accela.com${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;

    // Verify permalink independently with a clean GET
    const check = await fetchWithRedirect(fullUrl);
    if (check.statusCode === 200 && check.body && check.body.length > 5000 && !check.body.includes('Login.aspx')) {
      return { status: 'valid', url: fullUrl };
    }

    return { status: 'invalid' };
  } catch (err) {
    return { status: 'retry' };
  }
}

export async function runAccelaWorker() {
  let pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    keepAlive: true,
  });

  async function safeQuery(sql, params = []) {
    let retries = 30; // Retry up to 30 times with exponential/backoff to handle transient DNS or wifi blips
    while (retries > 0) {
      try {
        return await pool.query(sql, params);
      } catch (err) {
        console.error(`[DB Error] ${err.message}. Retrying in 10s... (retries left: ${retries})`);
        retries--;
        await sleep(10000);
        try {
          await pool.end();
        } catch (_) {}
        pool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          max: 5,
          idleTimeoutMillis: 30000,
          keepAlive: true,
        });
      }
    }
    throw new Error('Database reconnection failed after 30 retries');
  }

  console.log('=== Municipal Accela Verified Link Worker (Lead & Commercial Priority) ===\n');

  // Check if Accela is in maintenance mode right now
  const healthCheck = await fetchWithRedirect(BASE_URL);
  if (healthCheck.body.includes('Scheduled Maintenance') || healthCheck.body.includes('site-status" content="maintenante"')) {
    console.log('[MAINTENANCE] City of Dallas Accela Citizen Access is currently undergoing scheduled maintenance.');
    console.log('Worker will wait until maintenance completes before sending search queries.');
    await pool.end();
    return;
  }

  // Baseline stats
  const baseline = await pool.query(`
    select 
      count(*) filter (where source_links ? 'accela') as verified,
      count(*) filter (where source_links ? 'accela_checked' and not (source_links ? 'accela')) as blank,
      count(*) filter (where not (source_links ? 'accela_checked')) as pending
    from warehouse.parcels
    where is_live = true and (lower(city) = 'dallas' or jurisdiction = 'Dallas, TX')
      and id not like 'MOCK-%' and coalesce(is_mock, false) = false;
  `);

  let totalVerified = Number(baseline.rows[0].verified || 0);
  let totalBlank = Number(baseline.rows[0].blank || 0);
  let totalPending = Number(baseline.rows[0].pending || 0);
  const totalTarget = totalVerified + totalBlank + totalPending;

  console.log(`Target Dallas live parcels: ${totalTarget.toLocaleString()}`);
  console.log(`Initial Verified: ${totalVerified.toLocaleString()} | Initial Blank: ${totalBlank.toLocaleString()} | Pending: ${totalPending.toLocaleString()}\n`);

  let sessionProcessed = 0;
  let sessionVerified = 0;
  let sessionBlank = 0;
  const startTime = Date.now();

  while (true) {
    const batchRes = await safeQuery(`
      select p.id, p.address, p.city, p.source_links,
             (select raw_permit_number from warehouse.normalized_permits np where np.parcel_id = p.id and length(np.raw_permit_number) >= 8 limit 1) as sample_permit
      from warehouse.parcels p
      where p.is_live = true and (lower(p.city) = 'dallas' or p.jurisdiction = 'Dallas, TX')
        and p.id not like 'MOCK-%' and coalesce(p.is_mock, false) = false
        and not (p.source_links ? 'accela_checked')
      order by 
        (exists(select 1 from warehouse.released_leads rl where rl.parcel_id = p.id) or exists(select 1 from warehouse.scored_parcel_leads spl where spl.parcel_id = p.id)) desc,
        p.building_sqft desc nulls last,
        p.total_valuation desc nulls last
      limit $1;
    `, [BATCH_SIZE]);

    const rows = batchRes.rows;
    if (!rows || rows.length === 0) {
      console.log('\nAll pending Dallas parcels have been verified for Accela!');
      break;
    }

    for (const row of rows) {
      const parsed = parseAddress(row.address);
      if (!parsed && !row.sample_permit) {
        const links = { ...(row.source_links || {}), accela_checked: true };
        await safeQuery('UPDATE warehouse.parcels SET source_links = $1::jsonb WHERE id = $2', [JSON.stringify(links), row.id]);
        sessionBlank++;
        sessionProcessed++;
        continue;
      }

      let check = await lookupAccelaRecord(parsed?.num, parsed?.street, row.sample_permit);

      // Handle maintenance mode
      while (check.status === 'maintenance') {
        console.log('[MAINTENANCE] Accela is currently down for scheduled maintenance. Sleeping 10 minutes...');
        await sleep(10 * 60 * 1000);
        check = await lookupAccelaRecord(parsed?.num, parsed?.street, row.sample_permit);
      }

      // Handle Cloudflare 429 Rate Limit backoff
      while (check.status === 'rate_limit') {
        const waitSec = check.retryAfter || 180;
        console.log(`[Cloudflare 429] Backing off for ${waitSec}s before retrying ${row.address}...`);
        await sleep((waitSec + 5) * 1000);
        check = await lookupAccelaRecord(parsed?.num, parsed?.street, row.sample_permit);
      }

      if (check.status === 'retry') {
        await sleep(3000);
        check = await lookupAccelaRecord(parsed?.num, parsed?.street, row.sample_permit);
      }

      if (check.status === 'valid') {
        const links = { ...(row.source_links || {}), accela: check.url, accela_checked: true };
        await safeQuery('UPDATE warehouse.parcels SET source_links = $1::jsonb WHERE id = $2', [JSON.stringify(links), row.id]);
        sessionVerified++;
        sessionProcessed++;
        console.log(`[ACCELA VERIFIED] ${row.address} -> ${check.url}`);
      } else {
        const links = { ...(row.source_links || {}), accela_checked: true };
        await safeQuery('UPDATE warehouse.parcels SET source_links = $1::jsonb WHERE id = $2', [JSON.stringify(links), row.id]);
        sessionBlank++;
        sessionProcessed++;
      }

      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0);
      const overallProcessed = totalVerified + totalBlank + sessionProcessed;
      const pct = ((overallProcessed / (totalTarget || 1)) * 100).toFixed(1);

      if (sessionProcessed % 5 === 0) {
        console.log(
          `[${pct}%] Processed: ${sessionProcessed} | Verified Accela: ${(totalVerified + sessionVerified)} | Unindexed: ${(totalBlank + sessionBlank)} | Elapsed: ${elapsedSec}s`
        );
      }

      await randomDelay();
    }
  }

  await pool.end();
}

if (process.argv[1]?.endsWith('verify_live_accela_links.mjs')) {
  runAccelaWorker().catch((err) => {
    console.error('Worker error:', err);
    process.exit(1);
  });
}
