import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("Tables in PG:", res.rows.map(r => r.table_name));

    if (res.rows.some(r => r.table_name === 'permits')) {
      const pCount = await pool.query("SELECT COUNT(*) FROM permits");
      console.log("Permits in PG:", pCount.rows[0].count);

      const nvCount = await pool.query("SELECT COUNT(*) FROM permits WHERE contractor_name ILIKE '%New View%' OR contractor_name ILIKE '%MOB%'");
      console.log("New View permits in PG:", nvCount.rows[0].count);

      const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='permits'");
      console.log("Permits PG cols:\n", cols.rows.map(c => `  ${c.column_name}: ${c.data_type}`).join('\n'));
      
      const sample = await pool.query("SELECT * FROM permits LIMIT 1");
      console.log("Sample PG permit row:", sample.rows[0]);
    } else {
      console.log("No permits table in PG!");
    }
  } catch (err) {
    console.error("PG Error:", err);
  } finally {
    await pool.end();
  }
}

check();

