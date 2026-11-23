import fs from "node:fs";
import readline from "node:readline";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("d:/Depoii_nextjs/package.json"));
const { Pool } = require("pg");

const env = fs.readFileSync("d:/Depoii_nextjs/.env", "utf8");
const m =
  env.match(/^DIRECT_URL="?([^"\r\n]+)"?/m) ||
  env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m);

const pool = new Pool({
  connectionString: m[1],
  ssl: { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
});

const SCRATCH_DIR = "C:/Users/alimi/.gemini/antigravity/brain/6d56e765-703f-4fa4-a402-b7f31950415e/scratch";
const COMPILED_NDJSON = `${SCRATCH_DIR}/dcad_2026_commercial_compiled.ndjson`;
const SHX_PATH = `${SCRATCH_DIR}/dcad_extracted/PARCEL2026/PARCEL2026/PARCEL2026.shx`;
const SHP_PATH = `${SCRATCH_DIR}/dcad_extracted/PARCEL2026/PARCEL2026/PARCEL2026.shp`;
const DBF_PATH = `${SCRATCH_DIR}/dcad_extracted/PARCEL2026/PARCEL2026/PARCEL2026.dbf`;

function loadShapefileCenters() {
  console.log("Loading shapefile bounding-box centers from official PARCEL2026 files...");
  const start = Date.now();
  const shxBuf = fs.readFileSync(SHX_PATH);
  const numRecords = (shxBuf.length - 100) / 8;
  const dbfBuf = fs.readFileSync(DBF_PATH);
  const dbfHeaderLen = dbfBuf.readUInt16LE(8);
  const dbfRecLen = dbfBuf.readUInt16LE(10);
  const shpFd = fs.openSync(SHP_PATH, "r");
  const shpBoxBuf = Buffer.alloc(44);

  const coordsMap = new Map();
  for (let i = 0; i < numRecords; i++) {
    const dbfOffset = dbfHeaderLen + i * dbfRecLen;
    const acct = dbfBuf.toString("ascii", dbfOffset + 1, dbfOffset + 51).trim();
    const shpOffset = shxBuf.readUInt32BE(100 + i * 8) * 2;
    fs.readSync(shpFd, shpBoxBuf, 0, 44, shpOffset);
    const shapeType = shpBoxBuf.readInt32LE(8);
    if (shapeType === 5 || shapeType === 15 || shapeType === 25) {
      const xmin = shpBoxBuf.readDoubleLE(12);
      const ymin = shpBoxBuf.readDoubleLE(20);
      const xmax = shpBoxBuf.readDoubleLE(28);
      const ymax = shpBoxBuf.readDoubleLE(36);
      coordsMap.set(acct, { x: (xmin + xmax) / 2, y: (ymin + ymax) / 2 });
    }
  }
  fs.closeSync(shpFd);
  console.log(`Loaded ${coordsMap.size} polygon centers in ${((Date.now() - start) / 1000).toFixed(1)}s.`);
  return coordsMap;
}

async function loadExistingIds() {
  console.log("Fetching existing parcel IDs from warehouse.parcels...");
  const { rows } = await pool.query(`
    SELECT account_number, id, latitude, longitude
    FROM warehouse.parcels
    WHERE data_source ILIKE '%Dallas%' AND account_number IS NOT NULL
  `);
  const map = new Map();
  for (const r of rows) {
    map.set(r.account_number, r);
  }
  console.log(`Found ${map.size} existing Dallas parcels in warehouse.parcels.`);
  return map;
}

async function createStagingTable(client) {
  console.log("Creating staging table warehouse.stg_dcad_2026_commercial...");
  await client.query(`DROP TABLE IF EXISTS warehouse.stg_dcad_2026_commercial`);
  await client.query(`
    CREATE TABLE warehouse.stg_dcad_2026_commercial (
      id text PRIMARY KEY,
      account_number text,
      jurisdiction_id text,
      jurisdiction text,
      address text,
      city text,
      county text,
      state text,
      zip_code text,
      building_sqft bigint,
      land_sqft bigint,
      year_built integer,
      stories integer,
      footprint_sqft bigint,
      property_type text,
      owner_name text,
      owner_address text,
      owner_city text,
      owner_state text,
      owner_zip text,
      total_valuation double precision,
      improvement_valuation double precision,
      x_2276 double precision,
      y_2276 double precision,
      latitude double precision,
      longitude double precision,
      data_source text,
      data_provenance text,
      provenance_date text,
      source_record_id text,
      is_mock boolean
    )
  `);
}

async function insertBatch(client, batch) {
  if (batch.length === 0) return;
  const numCols = 31;
  const values = [];
  const params = [];

  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    const offset = i * numCols;
    const placeholders = Array.from({ length: numCols }, (_, idx) => `$${offset + idx + 1}`).join(", ");
    values.push(`(${placeholders})`);

    params.push(
      row.id,
      row.account_number,
      row.jurisdiction_id,
      row.jurisdiction,
      row.address,
      row.city,
      row.county,
      row.state,
      row.zip_code,
      row.building_sqft,
      row.land_sqft,
      row.year_built,
      row.stories,
      row.footprint_sqft,
      row.property_type,
      row.owner_name,
      row.owner_address,
      row.owner_city,
      row.owner_state,
      row.owner_zip,
      row.total_valuation,
      row.improvement_valuation,
      row.x_2276,
      row.y_2276,
      row.latitude,
      row.longitude,
      row.data_source,
      row.data_provenance,
      row.provenance_date,
      row.source_record_id,
      row.is_mock
    );
  }

  const query = `
    INSERT INTO warehouse.stg_dcad_2026_commercial (
      id, account_number, jurisdiction_id, jurisdiction, address, city, county, state, zip_code,
      building_sqft, land_sqft, year_built, stories, footprint_sqft, property_type,
      owner_name, owner_address, owner_city, owner_state, owner_zip,
      total_valuation, improvement_valuation, x_2276, y_2276, latitude, longitude,
      data_source, data_provenance, provenance_date, source_record_id, is_mock
    )
    VALUES ${values.join(", ")}
    ON CONFLICT (id) DO NOTHING
  `;
  await client.query(query, params);
}

async function main() {
  const overallStart = Date.now();
  console.log("=== INITIATING FULL DCAD 2026 COMMERCIAL PROPERTIES INJECTION ===");

  const coordsMap = loadShapefileCenters();
  const existingMap = await loadExistingIds();

  const client = await pool.connect();
  try {
    await createStagingTable(client);

    console.log("Streaming records from compiled NDJSON into staging table...");
    const rl = readline.createInterface({ input: fs.createReadStream(COMPILED_NDJSON), crlfDelay: Infinity });

    let batch = [];
    let count = 0;
    const BATCH_SIZE = 1000;

    for await (const line of rl) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);

      // Preserve existing ID if account was already present in warehouse.parcels
      const existing = existingMap.get(row.account_number);
      const id = existing ? existing.id : row.id;

      // Coordinate assignment: shapefile center first, fallback to existing DB coordinates
      let x = null;
      let y = null;
      let lat = null;
      let lng = null;

      const shpCenter = coordsMap.get(row.account_number);
      if (shpCenter) {
        x = shpCenter.x;
        y = shpCenter.y;
      } else if (existing && existing.latitude && existing.longitude) {
        lat = existing.latitude;
        lng = existing.longitude;
      }

      batch.push({
        id,
        account_number: row.account_number,
        jurisdiction_id: row.jurisdiction_id,
        jurisdiction: row.jurisdiction,
        address: row.address,
        city: row.city,
        county: row.county,
        state: row.state,
        zip_code: row.zip_code,
        building_sqft: row.building_sqft,
        land_sqft: row.land_sqft,
        year_built: row.year_built,
        stories: row.stories,
        footprint_sqft: row.footprint_sqft,
        property_type: row.property_type,
        owner_name: row.owner_name,
        owner_address: row.owner_address,
        owner_city: row.owner_city,
        owner_state: row.owner_state,
        owner_zip: row.owner_zip,
        total_valuation: row.total_valuation,
        improvement_valuation: row.improvement_valuation,
        x_2276: x,
        y_2276: y,
        latitude: lat,
        longitude: lng,
        data_source: row.data_source,
        data_provenance: row.data_provenance,
        provenance_date: row.provenance_date,
        source_record_id: row.source_record_id,
        is_mock: false,
      });

      count++;
      if (batch.length >= BATCH_SIZE) {
        await insertBatch(client, batch);
        batch = [];
        if (count % 10000 === 0) {
          console.log(`Staged ${count} records...`);
        }
      }
    }

    if (batch.length > 0) {
      await insertBatch(client, batch);
      console.log(`Staged final batch. Total staged: ${count}.`);
    }

    console.log("Upserting from staging table into warehouse.parcels with spatial transformations...");
    const mergeStart = Date.now();

    const mergeSql = `
      INSERT INTO warehouse.parcels (
        id, account_number, jurisdiction_id, jurisdiction, address, city, county, state, zip_code,
        building_sqft, land_sqft, year_built, stories, footprint_sqft, property_type,
        owner_name, owner_address, owner_city, owner_state, owner_zip,
        total_valuation, improvement_valuation, latitude, longitude, geom_point,
        data_source, data_provenance, provenance_date, source_record_id, is_mock, created_at
      )
      SELECT
        s.id,
        s.account_number,
        s.jurisdiction_id,
        s.jurisdiction,
        s.address,
        s.city,
        s.county,
        s.state,
        s.zip_code,
        s.building_sqft,
        s.land_sqft,
        s.year_built,
        s.stories,
        s.footprint_sqft,
        s.property_type,
        s.owner_name,
        s.owner_address,
        s.owner_city,
        s.owner_state,
        s.owner_zip,
        s.total_valuation,
        s.improvement_valuation,
        COALESCE(
          s.latitude,
          CASE WHEN s.x_2276 IS NOT NULL AND s.y_2276 IS NOT NULL
               THEN ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(s.x_2276, s.y_2276), 2276), 4326))
          END
        ) AS latitude,
        COALESCE(
          s.longitude,
          CASE WHEN s.x_2276 IS NOT NULL AND s.y_2276 IS NOT NULL
               THEN ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(s.x_2276, s.y_2276), 2276), 4326))
          END
        ) AS longitude,
        COALESCE(
          CASE WHEN s.latitude IS NOT NULL AND s.longitude IS NOT NULL
               THEN ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)
               WHEN s.x_2276 IS NOT NULL AND s.y_2276 IS NOT NULL
               THEN ST_Transform(ST_SetSRID(ST_MakePoint(s.x_2276, s.y_2276), 2276), 4326)
          END
        ) AS geom_point,
        s.data_source,
        s.data_provenance,
        s.provenance_date,
        s.source_record_id,
        s.is_mock,
        NOW()
      FROM warehouse.stg_dcad_2026_commercial s
      ON CONFLICT (id) DO UPDATE SET
        total_valuation = EXCLUDED.total_valuation,
        improvement_valuation = EXCLUDED.improvement_valuation,
        owner_name = COALESCE(EXCLUDED.owner_name, warehouse.parcels.owner_name),
        owner_address = COALESCE(EXCLUDED.owner_address, warehouse.parcels.owner_address),
        owner_city = COALESCE(EXCLUDED.owner_city, warehouse.parcels.owner_city),
        owner_state = COALESCE(EXCLUDED.owner_state, warehouse.parcels.owner_state),
        owner_zip = COALESCE(EXCLUDED.owner_zip, warehouse.parcels.owner_zip),
        building_sqft = COALESCE(EXCLUDED.building_sqft, warehouse.parcels.building_sqft),
        land_sqft = COALESCE(EXCLUDED.land_sqft, warehouse.parcels.land_sqft),
        year_built = COALESCE(EXCLUDED.year_built, warehouse.parcels.year_built),
        stories = COALESCE(EXCLUDED.stories, warehouse.parcels.stories),
        footprint_sqft = COALESCE(EXCLUDED.footprint_sqft, warehouse.parcels.footprint_sqft),
        property_type = COALESCE(EXCLUDED.property_type, warehouse.parcels.property_type),
        latitude = COALESCE(EXCLUDED.latitude, warehouse.parcels.latitude),
        longitude = COALESCE(EXCLUDED.longitude, warehouse.parcels.longitude),
        geom_point = COALESCE(EXCLUDED.geom_point, warehouse.parcels.geom_point),
        data_provenance = EXCLUDED.data_provenance,
        provenance_date = EXCLUDED.provenance_date
    `;

    const res = await client.query(mergeSql);
    console.log(`Upsert merged ${res.rowCount} rows in ${((Date.now() - mergeStart) / 1000).toFixed(1)}s.`);

    console.log("Cleaning up staging table...");
    await client.query(`DROP TABLE IF EXISTS warehouse.stg_dcad_2026_commercial`);

    console.log(`\n=== INJECTION FULLY COMPLETED in ${((Date.now() - overallStart) / 1000).toFixed(1)}s! ===`);
  } finally {
    client.release();
  }

  // Verification Queries
  console.log("\n=== RUNNING POST-INJECTION VERIFICATION ===");
  const { rows: postStats } = await pool.query(`
    SELECT
      COUNT(*)::bigint AS total_parcels,
      COUNT(*) FILTER (WHERE data_source ILIKE '%Dallas%')::bigint AS dallas_parcels,
      COUNT(*) FILTER (WHERE data_source ILIKE '%Dallas%' AND total_valuation > 0)::bigint AS dallas_with_valuation,
      COUNT(*) FILTER (WHERE data_source ILIKE '%Dallas%' AND improvement_valuation > 0)::bigint AS dallas_with_impr_val,
      COUNT(*) FILTER (WHERE data_source ILIKE '%Dallas%' AND building_sqft > 0)::bigint AS dallas_with_bldg_sqft,
      COUNT(*) FILTER (WHERE data_source ILIKE '%Dallas%' AND geom_point IS NOT NULL)::bigint AS dallas_geocoded
    FROM warehouse.parcels
  `);
  console.table(postStats);

  await pool.end();
}

main().catch((err) => {
  console.error("FATAL ERROR DURING INJECTION:", err);
  process.exit(1);
});

