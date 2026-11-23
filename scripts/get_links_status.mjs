import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/depoii',
});

async function check() {
  try {
    const accelaRes = await pool.query("SELECT count(*)::int as cnt FROM warehouse.parcels WHERE source_links ? 'accela'");
    const checkedRes = await pool.query("SELECT count(*)::int as cnt FROM warehouse.parcels WHERE source_links ? 'accela_checked'");
    const dcadRes = await pool.query("SELECT count(*)::int as cnt FROM warehouse.parcels WHERE source_links ? 'dcad'");
    const remainingDallas = await pool.query(`
      SELECT count(*)::int as cnt 
      FROM warehouse.parcels p
      WHERE p.is_live = true and (lower(p.city) = 'dallas' or p.jurisdiction = 'Dallas, TX')
        and p.id not like 'MOCK-%' and coalesce(p.is_mock, false) = false
        and not (p.source_links ? 'accela_checked')
    `);
    const totalDallas = await pool.query(`
      SELECT count(*)::int as cnt 
      FROM warehouse.parcels p
      WHERE p.is_live = true and (lower(p.city) = 'dallas' or p.jurisdiction = 'Dallas, TX')
        and p.id not like 'MOCK-%' and coalesce(p.is_mock, false) = false
    `);

    console.log(JSON.stringify({
      verifiedAccela: accelaRes.rows[0].cnt,
      accelaChecked: checkedRes.rows[0].cnt,
      verifiedDcad: dcadRes.rows[0].cnt,
      remainingDallas: remainingDallas.rows[0].cnt,
      totalDallas: totalDallas.rows[0].cnt
    }, null, 2));
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

check();
