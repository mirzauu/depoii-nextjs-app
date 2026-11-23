import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("d:/Depoii_nextjs/package.json"));
const { Pool } = require("pg");

const env = fs.readFileSync("d:/Depoii_nextjs/.env", "utf8");
const m =
  env.match(/^DIRECT_URL="?([^"\r\n]+)"?/m) ||
  env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m);

if (!m) {
  console.error("No database connection string found in .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: m[1],
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  max: 10,
});

// Deterministic Address Normalizer
function normalizeStreetAddress(raw) {
  if (!raw) return "";
  let addr = raw.trim().toUpperCase();
  addr = addr.replace(/,\s*DALLAS\s*,?\s*TX.*$/i, "");
  addr = addr.replace(/,\s*TX\s*\d*$/i, "");
  addr = addr.replace(/[.,#\-;:]/g, " ");
  addr = addr.replace(/\b(STE|SUITE|BLDG|BUILDING|UNIT|FL|FLOOR|RM|ROOM|APT|DEPT)\s+[A-Z0-9]+/gi, "");
  addr = addr.replace(/\b(STE|SUITE|BLDG|BUILDING|UNIT|FL|FLOOR|RM|ROOM|APT|DEPT)\b/gi, "");
  addr = addr.replace(/\bL\s+B\s+J\b/g, "LBJ");
  addr = addr.replace(/\b(I\s*H|INTERSTATE)\s*35\s*E?\b/g, "IH 35E");
  addr = addr.replace(/\b(I\s*H|INTERSTATE)\s*635\b/g, "LBJ FWY");
  addr = addr.replace(/\b(I\s*H|INTERSTATE)\s*30\b/g, "IH 30");
  addr = addr.replace(/\b(U\s*S|US|HIGHWAY|HWY)\s*75\b/g, "US 75");
  addr = addr.replace(/\bNORTH\b/g, "N");
  addr = addr.replace(/\bSOUTH\b/g, "S");
  addr = addr.replace(/\bEAST\b/g, "E");
  addr = addr.replace(/\bWEST\b/g, "W");
  addr = addr.replace(/\bSTREET\b/g, "ST");
  addr = addr.replace(/\bAVENUE\b/g, "AVE");
  addr = addr.replace(/\bBOULEVARD\b/g, "BLVD");
  addr = addr.replace(/\bROAD\b/g, "RD");
  addr = addr.replace(/\bDRIVE\b/g, "DR");
  addr = addr.replace(/\bPARKWAY\b/g, "PKWY");
  addr = addr.replace(/\bFREEWAY\b/g, "FWY");
  addr = addr.replace(/\bHIGHWAY\b/g, "HWY");
  addr = addr.replace(/\bCOURT\b/g, "CT");
  addr = addr.replace(/\bCIRCLE\b/g, "CIR");
  addr = addr.replace(/\bLANE\b/g, "LN");
  addr = addr.replace(/\bPLACE\b/g, "PL");
  addr = addr.replace(/\bTRAIL\b/g, "TRL");
  addr = addr.replace(/\bEXPRESSWAY\b/g, "EXPY");
  return addr.replace(/\s+/g, " ").trim();
}

function parseCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function parseDate(dStr) {
  if (!dStr) return null;
  const parts = dStr.trim().split("/");
  if (parts.length === 3) {
    let [m, d, y] = parts;
    if (y.length === 2) {
      const yNum = parseInt(y, 10);
      y = yNum >= 50 ? "19" + y : "20" + y;
    }
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(dStr)) {
    return dStr.slice(0, 10);
  }
  return null;
}

function parseContractor(raw) {
  if (!raw) return { name: null, phone: null };
  const str = raw.trim();
  const phoneMatch = str.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  let name = str;
  if (phone) {
    name = name.replace(phone, "");
  }
  const addrMatch = name.search(/\b\d{2,}\s+[A-Z]|\bPO BOX\b|\bP\.O\./i);
  if (addrMatch > 0) {
    name = name.slice(0, addrMatch);
  }
  name = name.replace(/[,\/\\\-]+$/, "").trim();
  return { name: name || str, phone };
}

async function main() {
  const overallStart = Date.now();
  console.log("================================================================================");
  console.log("DEPOII ENTERPRISE PERMIT HARVEST ENGINE: 21,850 CITY OF DALLAS BUILDINGS");
  console.log("================================================================================\n");

  // STEP 1: Load Dallas Commercial Buildings
  console.log("[1/5] Loading 21,850 Dallas commercial buildings from warehouse.parcels...");
  const { rows: parcels } = await pool.query(`
    SELECT id, address, building_sqft, total_valuation, owner_name, year_built
    FROM warehouse.parcels
    WHERE data_source ILIKE '%Dallas%'
      AND city ILIKE 'Dallas'
      AND (building_sqft::numeric > 0)
  `);
  console.log(`Loaded ${parcels.length} commercial buildings.`);

  const parcelMap = new Map();
  for (const p of parcels) {
    const norm = normalizeStreetAddress(p.address);
    if (!norm) continue;
    if (!parcelMap.has(norm)) {
      parcelMap.set(norm, []);
    }
    parcelMap.get(norm).push(p.id);
  }
  console.log(`Indexed ${parcelMap.size} unique normalized building addresses.\n`);

  // STEP 2: Link Existing Unlinked Permits in Database
  console.log("[2/5] Linking existing unlinked permits in warehouse.normalized_permits...");
  const { rows: unlinked } = await pool.query(`
    SELECT id, normalized_address
    FROM warehouse.normalized_permits
    WHERE (city ILIKE 'Dallas' OR jurisdiction ILIKE '%Dallas%')
      AND parcel_id IS NULL
  `);
  console.log(`Found ${unlinked.length} unlinked Dallas permits in DB.`);

  let dbLinked = 0;
  const updateBatches = [];
  for (const up of unlinked) {
    const norm = normalizeStreetAddress(up.normalized_address);
    if (parcelMap.has(norm)) {
      const pids = parcelMap.get(norm);
      updateBatches.push({ permitId: up.id, parcelId: pids[0] });
    }
  }

  // Batch update unlinked permits in chunks of 1000
  const BATCH_SIZE = 1000;
  for (let i = 0; i < updateBatches.length; i += BATCH_SIZE) {
    const chunk = updateBatches.slice(i, i + BATCH_SIZE);
    const pids = chunk.map((c) => c.parcelId);
    const ids = chunk.map((c) => c.permitId);
    await pool.query(
      `
      UPDATE warehouse.normalized_permits AS np
      SET parcel_id = c.parcel_id
      FROM (
        SELECT unnest($1::text[]) AS parcel_id, unnest($2::text[]) AS id
      ) AS c
      WHERE np.id = c.id
    `,
      [pids, ids]
    );
    dbLinked += chunk.length;
  }
  console.log(`Successfully linked ${dbLinked} existing DB permits to commercial buildings!\n`);

  // STEP 3: Stream & Ingest Matched Socrata Permits (2018–2026)
  console.log("[3/5] Streaming 396,258 Socrata permits from CSV and injecting matches...");
  const csvFile = "C:/Users/alimi/.gemini/antigravity/brain/6d56e765-703f-4fa4-a402-b7f31950415e/scratch/dallas_socrata_building_permits.csv";
  
  if (!fs.existsSync(csvFile)) {
    throw new Error(`Socrata CSV file not found at ${csvFile}`);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(csvFile),
    crlfDelay: Infinity,
  });

  let totalCsv = 0;
  let matchedCsvCount = 0;
  let insertCount = 0;
  let isHeader = true;
  let batch = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    const client = await pool.connect();
    try {
      const ids = batch.map((r) => r.id);
      const rawNumbers = batch.map((r) => r.raw_permit_number);
      const jurIds = batch.map((r) => r.jurisdiction_id);
      const parcelIds = batch.map((r) => r.parcel_id);
      const sourceSystems = batch.map((r) => r.source_system);
      const jurisdictions = batch.map((r) => r.jurisdiction);
      const states = batch.map((r) => r.state);
      const cities = batch.map((r) => r.city);
      const issueDates = batch.map((r) => r.issue_date);
      const statuses = batch.map((r) => r.status);
      const addresses = batch.map((r) => r.normalized_address);
      const zipCodes = batch.map((r) => r.zip_code);
      const valuations = batch.map((r) => r.valuation);
      const valFormatted = batch.map((r) => r.valuation_formatted);
      const categories = batch.map((r) => r.category);
      const descriptions = batch.map((r) => r.raw_description);
      const sqfts = batch.map((r) => r.square_footage);
      const contractorNames = batch.map((r) => r.contractor_name);
      const contractorPhones = batch.map((r) => r.contractor_phone);
      const isReroofs = batch.map((r) => r.is_pure_reroof);
      const confidenceScores = batch.map((r) => r.confidence_score);

      await client.query(
        `
        INSERT INTO warehouse.normalized_permits (
          id, raw_permit_number, jurisdiction_id, parcel_id, source_system,
          jurisdiction, state, city, issue_date, status, normalized_address,
          zip_code, valuation, valuation_formatted, category, raw_description,
          square_footage, contractor_name, contractor_phone, is_pure_reroof,
          confidence_score
        )
        SELECT
          unnest($1::text[]),
          unnest($2::text[]),
          unnest($3::text[]),
          unnest($4::text[]),
          unnest($5::text[]),
          unnest($6::text[]),
          unnest($7::text[]),
          unnest($8::text[]),
          unnest($9::date[]),
          unnest($10::text[]),
          unnest($11::text[]),
          unnest($12::text[]),
          unnest($13::double precision[]),
          unnest($14::text[]),
          unnest($15::text[]),
          unnest($16::text[]),
          unnest($17::bigint[]),
          unnest($18::text[]),
          unnest($19::text[]),
          unnest($20::boolean[]),
          unnest($21::integer[])
        ON CONFLICT (raw_permit_number, jurisdiction, issue_date)
        DO UPDATE SET
          parcel_id = COALESCE(warehouse.normalized_permits.parcel_id, EXCLUDED.parcel_id),
          contractor_name = CASE WHEN warehouse.normalized_permits.contractor_name IS NULL OR warehouse.normalized_permits.contractor_name = 'On Municipal Record' THEN EXCLUDED.contractor_name ELSE warehouse.normalized_permits.contractor_name END,
          contractor_phone = COALESCE(warehouse.normalized_permits.contractor_phone, EXCLUDED.contractor_phone),
          valuation = CASE WHEN warehouse.normalized_permits.valuation IS NULL OR warehouse.normalized_permits.valuation = 0 THEN EXCLUDED.valuation ELSE warehouse.normalized_permits.valuation END
      `,
        [
          ids,
          rawNumbers,
          jurIds,
          parcelIds,
          sourceSystems,
          jurisdictions,
          states,
          cities,
          issueDates,
          statuses,
          addresses,
          zipCodes,
          valuations,
          valFormatted,
          categories,
          descriptions,
          sqfts,
          contractorNames,
          contractorPhones,
          isReroofs,
          confidenceScores,
        ]
      );
      insertCount += batch.length;
    } finally {
      client.release();
    }
    batch = [];
  }

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    totalCsv++;
    const cols = parseCsvLine(line);
    const rawAddr = cols[9];
    if (!rawAddr) continue;

    const norm = normalizeStreetAddress(rawAddr);
    if (!parcelMap.has(norm)) continue;

    matchedCsvCount++;
    const pids = parcelMap.get(norm);
    const parcelId = pids[0]; // Primary matched parcel

    const rawPermitNo = (cols[0] || "").trim();
    if (!rawPermitNo) continue;

    const issueDate = parseDate(cols[2]);
    if (!issueDate) continue;

    const permitType = (cols[1] || "").trim();
    const workDesc = (cols[7] || "").trim();
    const upperCombined = (permitType + " " + workDesc).toUpperCase();

    const isRoofing = upperCombined.includes("ROOF");
    const isPureReroof =
      upperCombined.includes("REROOF") ||
      upperCombined.includes("REMOVE EXISTING ROOF") ||
      upperCombined.includes("TEAR OFF") ||
      upperCombined.includes("REPLACE ROOF") ||
      upperCombined.includes("NEW ROOF");

    let category = "Commercial Renovation";
    if (isRoofing) category = "Roofing";
    else if (upperCombined.includes("NEW CONSTRUCTION") || upperCombined.includes("CONSTRUCT NEW")) category = "New Construction";
    else if (upperCombined.includes("ELECTRICAL")) category = "Electrical";
    else if (upperCombined.includes("PLUMBING")) category = "Plumbing";
    else if (upperCombined.includes("MECHANICAL") || upperCombined.includes("HVAC")) category = "HVAC / Mechanical";

    const valNum = parseFloat(cols[5]) || 0;
    const sqftNum = parseInt(cols[6], 10) || null;
    const { name: contractorName, phone: contractorPhone } = parseContractor(cols[4]);
    const zip = (cols[10] || "").trim().slice(0, 10) || null;

    const permitRecordId = `DAL-SOC-${rawPermitNo.replace(/[^A-Za-z0-9_-]/g, "_")}`;

    batch.push({
      id: permitRecordId,
      raw_permit_number: rawPermitNo,
      jurisdiction_id: "JUR-DAL-001",
      parcel_id: parcelId,
      source_system: "City of Dallas Open Data (Socrata e7gq-4sah)",
      jurisdiction: "Dallas, TX",
      state: "TX",
      city: "Dallas",
      issue_date: issueDate,
      status: "Issued",
      normalized_address: norm,
      zip_code: zip,
      valuation: valNum,
      valuation_formatted: valNum > 0 ? `$${valNum.toLocaleString()}` : "$0",
      category,
      raw_description: workDesc || permitType,
      square_footage: sqftNum,
      contractor_name: contractorName || "On Municipal Record",
      contractor_phone: contractorPhone,
      is_pure_reroof: isPureReroof,
      confidence_score: 95,
    });

    if (batch.length >= 1000) {
      await flushBatch();
      if (insertCount % 10000 === 0) {
        console.log(`... staged & upserted ${insertCount} / ${matchedCsvCount} matched permits...`);
      }
    }
  }

  if (batch.length > 0) {
    await flushBatch();
  }
  console.log(`Successfully ingested and upserted ${insertCount} Socrata permits into warehouse.normalized_permits!\n`);

  // STEP 4: Compute Commercial Roof Intelligence & Update warehouse.parcels
  console.log("[4/5] Computing commercial roof intelligence across all 21,850 buildings...");
  
  // Aggregate latest reroof permit per parcel
  const roofUpdateRes = await pool.query(`
    WITH latest_roofing AS (
      SELECT DISTINCT ON (parcel_id)
        parcel_id,
        issue_date,
        raw_permit_number,
        contractor_name,
        valuation
      FROM warehouse.normalized_permits
      WHERE parcel_id IS NOT NULL
        AND (category = 'Roofing' OR raw_description ILIKE '%roof%')
        AND issue_date >= '2000-01-01'
      ORDER BY parcel_id, issue_date DESC
    )
    UPDATE warehouse.parcels AS p
    SET
      last_reroof_date = lr.issue_date::text,
      last_reroof_permit_no = lr.raw_permit_number,
      roof_age_years = GREATEST(0, 2026 - EXTRACT(YEAR FROM lr.issue_date)::int),
      roof_age_basis = 'PERMIT'
    FROM latest_roofing lr
    WHERE p.id = lr.parcel_id
      AND p.city ILIKE 'Dallas'
      AND (p.building_sqft::numeric > 0)
  `);
  console.log(`Updated ${roofUpdateRes.rowCount} buildings with verified PERMIT-based roof age & last reroof date.`);

  // Update remaining buildings using certified DCAD year_built
  const yearBuiltRes = await pool.query(`
    UPDATE warehouse.parcels
    SET
      roof_age_years = GREATEST(0, 2026 - year_built),
      roof_age_basis = 'YEAR_BUILT'
    WHERE city ILIKE 'Dallas'
      AND (building_sqft::numeric > 0)
      AND year_built IS NOT NULL
      AND year_built > 1900
      AND last_reroof_date IS NULL
  `);
  console.log(`Updated ${yearBuiltRes.rowCount} buildings with DCAD YEAR_BUILT-based roof age baseline.\n`);

  // STEP 5: Final Audit & Verification Report
  console.log("[5/5] Generating final verification report...");
  const { rows: finalAudit } = await pool.query(`
    SELECT
      COUNT(*) as total_dallas_buildings,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM warehouse.normalized_permits np WHERE np.parcel_id = p.id)) as buildings_with_permits,
      COUNT(*) FILTER (WHERE last_reroof_date IS NOT NULL) as buildings_with_reroof_history,
      COUNT(*) FILTER (WHERE roof_age_years IS NOT NULL) as buildings_with_calculated_roof_age,
      ROUND(AVG(roof_age_years)::numeric, 1) as avg_roof_age_years,
      COUNT(*) FILTER (WHERE roof_age_years >= 15) as prime_roof_replacement_leads
    FROM warehouse.parcels p
    WHERE p.city ILIKE 'Dallas'
      AND (p.building_sqft::numeric > 0)
  `);

  const { rows: permitTotals } = await pool.query(`
    SELECT
      COUNT(*) as total_dallas_permits_in_db,
      COUNT(parcel_id) as total_linked_permits,
      COUNT(*) FILTER (WHERE category = 'Roofing' OR raw_description ILIKE '%roof%') as total_roofing_permits,
      COUNT(DISTINCT parcel_id) as unique_parcels_linked
    FROM warehouse.normalized_permits
    WHERE city ILIKE 'Dallas' OR jurisdiction ILIKE '%Dallas%'
  `);

  const durationSec = ((Date.now() - overallStart) / 1000).toFixed(1);
  console.log("================================================================================");
  console.log(`HARVEST COMPLETE IN ${durationSec} SECONDS!`);
  console.log("================================================================================");
  console.log("BUILDING LEVEL AUDIT:");
  console.table(finalAudit);
  console.log("\nPERMIT LEVEL AUDIT:");
  console.table(permitTotals);

  await pool.end();
}

main().catch(console.error);

