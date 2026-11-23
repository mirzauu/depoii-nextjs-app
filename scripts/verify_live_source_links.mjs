import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const CONCURRENCY = 4;
const BATCH_SIZE = 50;
const TIMEOUT_MS = 6000;
const DELAY_BETWEEN_CHUNKS_MS = 250;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function verifyDCAD(account) {
  const comUrl = `https://www.dallascad.org/AcctDetailCom.aspx?ID=${account}`;
  const resUrl = `https://www.dallascad.org/AcctDetailRes.aspx?ID=${account}`;

  try {
    // 1. Try Commercial URL
    const respCom = await fetch(comUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    if (respCom.ok) {
      const text = await respCom.text();
      if (!text.includes('Detail Error') && !text.includes('No Data No DataNo Data')) {
        const match = text.match(/id="PropAddr1_lblPropAddr"[^>]*>([^<]*)</i);
        const propAddr = match ? match[1].replace(/&nbsp;/g, ' ').trim() : '';
        if (propAddr && propAddr.length >= 3) {
          return { status: 'valid', url: comUrl, propAddr };
        }
      }
    }

    // 2. Try Residential URL
    const respRes = await fetch(resUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    if (respRes.ok) {
      const text = await respRes.text();
      if (!text.includes('Detail Error') && !text.includes('No Data No DataNo Data')) {
        const match = text.match(/id="PropAddr1_lblPropAddr"[^>]*>([^<]*)</i);
        const propAddr = match ? match[1].replace(/&nbsp;/g, ' ').trim() : '';
        if (propAddr && propAddr.length >= 3) {
          return { status: 'valid', url: resUrl, propAddr };
        }
      }
    }

    return { status: 'invalid' };
  } catch {
    return { status: 'retry' };
  }
}

async function runWorker() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  console.log('=== RESUMING OPTIMIZED DCAD LIVE SOURCE LINKS VERIFIER (WITH AUTO-RECONNECT POOL) ===');

  const countRes = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE NOT (source_links ? 'dcad_checked')) as pending,
      COUNT(*) FILTER (WHERE source_links ? 'dcad') as already_verified,
      COUNT(*) FILTER (WHERE (source_links ? 'dcad_checked') AND NOT (source_links ? 'dcad')) as confirmed_blank
    FROM warehouse.parcels 
    WHERE county ILIKE '%Dallas%' AND is_live = true;
  `);

  let totalPending = parseInt(countRes.rows[0].pending, 10);
  let totalVerified = parseInt(countRes.rows[0].already_verified, 10);
  let totalBlank = parseInt(countRes.rows[0].confirmed_blank, 10);
  console.log(`Remaining to verify: ${totalPending.toLocaleString()} | Already verified: ${totalVerified.toLocaleString()} | Already blank: ${totalBlank.toLocaleString()}`);

  let sessionProcessed = 0;
  let sessionVerified = 0;
  let sessionBlank = 0;
  let sessionRetries = 0;
  const startTime = Date.now();

  while (true) {
    let rows = [];
    try {
      const res = await pool.query(`
        SELECT id, account_number, source_links 
        FROM warehouse.parcels 
        WHERE county ILIKE '%Dallas%' 
          AND is_live = true 
          AND NOT (source_links ? 'dcad_checked')
        ORDER BY id
        LIMIT ${BATCH_SIZE};
      `);
      rows = res.rows;
    } catch (e) {
      console.log('DB fetch error, reconnecting...', e.message);
      await sleep(3000);
      continue;
    }

    if (rows.length === 0) {
      console.log('\nAll pending live Dallas properties have been verified!');
      break;
    }

    const updates = [];

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const chunk = rows.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (row) => {
          if (!row.account_number || row.account_number.length < 5) {
            return { id: row.id, status: 'invalid', url: null, links: row.source_links };
          }
          const check = await verifyDCAD(row.account_number);
          return { id: row.id, status: check.status, url: check.url, links: row.source_links };
        })
      );

      for (const item of results) {
        if (item.status === 'valid') {
          const links = { ...(item.links || {}), dcad: item.url, dcad_checked: true };
          updates.push({ id: item.id, links: JSON.stringify(links) });
          sessionVerified++;
          sessionProcessed++;
        } else if (item.status === 'invalid') {
          const links = { ...(item.links || {}), dcad_checked: true };
          updates.push({ id: item.id, links: JSON.stringify(links) });
          sessionBlank++;
          sessionProcessed++;
        } else {
          sessionRetries++;
        }
      }

      await sleep(DELAY_BETWEEN_CHUNKS_MS);
    }

    if (updates.length > 0) {
      let client;
      try {
        client = await pool.connect();
        await client.query('BEGIN');
        for (const u of updates) {
          await client.query(`
            UPDATE warehouse.parcels 
            SET source_links = $1::jsonb 
            WHERE id = $2;
          `, [u.links, u.id]);
        }
        await client.query('COMMIT');
      } catch (e) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.log('DB commit error, retrying batch...', e.message);
        await sleep(2000);
        continue;
      } finally {
        if (client) client.release();
      }
    }

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const speed = (sessionProcessed / (elapsedSec || 1)).toFixed(1);
    const overallProcessed = (totalVerified + totalBlank + sessionProcessed);
    const pct = ((overallProcessed / 46503) * 100).toFixed(1);

    console.log(
      `[${pct}%] Processed: ${sessionProcessed.toLocaleString()} (Total: ${overallProcessed.toLocaleString()}/46503) | Verified: ${sessionVerified.toLocaleString()} | Blank: ${sessionBlank.toLocaleString()} | Retries: ${sessionRetries} | Speed: ${speed}/s | Elapsed: ${elapsedSec}s`
    );
  }

  await pool.end();
}

runWorker().catch((err) => {
  console.error('Worker error:', err);
  process.exit(1);
});
