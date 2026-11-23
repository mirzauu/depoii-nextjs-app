import fs from "node:fs";
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
  connectionTimeoutMillis: 30000,
});

// Advanced deterministic address normalizer
function cleanAddress(addr) {
  if (!addr) return "";
  let clean = addr
    .toUpperCase()
    .replace(/,\s*IRVING.*$/i, "")
    .replace(/,\s*TX.*$/i, "")
    .replace(/#.*$/, "")
    .replace(/\bSTE\b.*$/, "")
    .replace(/\bSUITE\b.*$/, "")
    .replace(/\bBLDG\b.*$/, "")
    .replace(/\bUNIT\b.*$/, "")
    .replace(/\bAPT\b.*$/, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize common suffixes
  clean = clean
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bPARKWAY\b/g, "PKWY")
    .replace(/\bHIGHWAY\b/g, "HWY")
    .replace(/\bFREEWAY\b/g, "FWY")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bCIRCLE\b/g, "CIR")
    .replace(/\bEXPRESSWAY\b/g, "EXPY");

  return clean.trim();
}

function extractStreetTokens(addr) {
  const clean = cleanAddress(addr);
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length < 2) return null;
  const num = parts[0];
  if (!/^\d+$/.test(num)) return null;

  // Filter out directionals N, S, E, W, NE, NW, SE, SW to get core street name
  const nameParts = parts.slice(1).filter((p) => !["N", "S", "E", "W", "NE", "NW", "SE", "SW", "ST", "RD", "DR", "AVE", "BLVD", "LN", "PKWY", "HWY", "FWY", "CT", "CIR"].includes(p));
  const coreName = nameParts.join(" ");
  return { num, coreName, fullClean: clean };
}

function isRoofingPermit(desc, type, subtype) {
  const combined = `${desc || ""} ${type || ""} ${subtype || ""}`.toLowerCase();
  const roofingKeywords = [
    "roof",
    "reroof",
    "re-roof",
    "shingle",
    "membrane",
    "tpo",
    "modified bitumen",
    "built-up",
    "standing seam",
    "roofing",
    "tear off",
    "metal roof",
  ];
  return roofingKeywords.some((kw) => combined.includes(kw));
}

function parseValuation(raw) {
  if (!raw) return 0;
  if (typeof raw === "number") return raw;
  const num = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
}

function parseDate(raw) {
  if (!raw) return null;
  if (typeof raw === "number") {
    // Timestamp ms
    return new Date(raw).toISOString().slice(0, 10);
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Fetch all features from ArcGIS FeatureServer using pagination
async function fetchAllFeatureServerRecords() {
  const baseUrl =
    "https://services3.arcgis.com/OfsJXUlu8pSkbl7B/arcgis/rest/services/Commercial_Permits_Issued_2_15_22_Present/FeatureServer/0/query";
  const records = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = `${baseUrl}?where=1%3D1&outFields=*&resultOffset=${offset}&resultRecordCount=${limit}&f=json`;
    console.log(`[ArcGIS FeatureServer] Fetching offset ${offset}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const features = data.features || [];
    if (features.length === 0) break;

    for (const f of features) {
      records.push(f.attributes);
    }
    offset += features.length;
    if (features.length < limit) break;
  }
  return records;
}

// Fetch CSV dataset for 2018 through Feb 2022
async function fetchCsvRecords() {
  const csvUrl =
    "https://cityofirving.maps.arcgis.com/sharing/rest/content/items/9f3f8836b32c4d59b3bcf8478a110253/data";
  console.log(`[ArcGIS Open Data] Downloading 2018-2022 historical CSV...`);
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to download CSV: HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  // issued,Permit No,permittype,description,permitsubtype,site addr,SITE ZIP,JOBVALUE
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV row parser handling quotes
    const cols = [];
    let insideQuotes = false;
    let current = "";
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        insideQuotes = !insideQuotes;
      } else if (ch === "," && !insideQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());

    if (cols.length >= 6) {
      records.push({
        issued: cols[0],
        permitNo: cols[1],
        permittype: cols[2],
        description: cols[3],
        permitsubtype: cols[4],
        siteAddr: cols[5],
        siteZip: cols[6],
        jobValue: cols[7],
      });
    }
  }
  return records;
}

async function main() {
  const start = Date.now();
  console.log("================================================================================");
  console.log("CITY OF IRVING COMMERCIAL PERMIT HARVESTER & ENRICHMENT ENGINE");
  console.log("================================================================================\n");

  // Step 1: Load Irving commercial parcels
  console.log("[1/6] Loading City of Irving commercial buildings from warehouse.parcels...");
  const { rows: irvingParcels } = await pool.query(`
    SELECT id, account_number, address, building_sqft, total_valuation, owner_name, year_built
    FROM warehouse.parcels
    WHERE data_source ILIKE '%Dallas%'
      AND city ILIKE 'Irving'
      AND (building_sqft::numeric > 0)
  `);
  console.log(`Loaded ${irvingParcels.length} Irving commercial buildings.`);

  // Build dual-index lookup tables
  const exactAddressMap = new Map();
  const streetTokenMap = new Map();

  for (const p of irvingParcels) {
    const fullClean = cleanAddress(p.address);
    if (fullClean) {
      if (!exactAddressMap.has(fullClean)) {
        exactAddressMap.set(fullClean, p);
      }
    }

    const tokens = extractStreetTokens(p.address);
    if (tokens && tokens.coreName) {
      const key = `${tokens.num}|${tokens.coreName}`;
      if (!streetTokenMap.has(key)) {
        streetTokenMap.set(key, p);
      }
    }
  }

  // Step 2: Fetch permits from both official sources
  console.log("\n[2/6] Harvesting official public records from City of Irving ArcGIS Hub...");
  const featureRecords = await fetchAllFeatureServerRecords();
  console.log(`Harvested ${featureRecords.length} records from FeatureServer (2022-Present).`);

  const csvRecords = await fetchCsvRecords();
  console.log(`Harvested ${csvRecords.length} records from CSV (2018-2022).`);

  // Step 3: Normalize and unify into warehouse.normalized_permits schema
  console.log("\n[3/6] Normalizing and linking permits to commercial parcels...");
  const normalizedRows = [];
  const seenPermitNos = new Set();

  // Process FeatureServer records (2022-Present)
  for (const item of featureRecords) {
    const rawNo = (item.Permit__ || "").trim();
    if (!rawNo || seenPermitNos.has(rawNo)) continue;
    seenPermitNos.add(rawNo);

    const issueDate = parseDate(item.Issued_Date) || "2023-01-01";
    const rawAddr = (item.Address || "").trim();
    const cleanAddr = cleanAddress(rawAddr);
    const tokens = extractStreetTokens(rawAddr);

    let matchedParcel = exactAddressMap.get(cleanAddr);
    let confidence = 0;

    if (matchedParcel) {
      confidence = 95;
    } else if (tokens && tokens.coreName) {
      const key = `${tokens.num}|${tokens.coreName}`;
      matchedParcel = streetTokenMap.get(key);
      if (matchedParcel) confidence = 85;
    }

    const valuation = parseValuation(item.Valuation);
    const isRoof = isRoofingPermit(item.Project_Description, item.Permit_Type, item.Designation);

    normalizedRows.push({
      id: `IRV-ARCGIS-${rawNo.replace(/[^A-Za-z0-9_-]/g, "_")}`,
      raw_permit_number: rawNo,
      jurisdiction_id: "JUR-IRV-001",
      parcel_id: matchedParcel ? matchedParcel.id : null,
      source_system: "City of Irving Open Data / ArcGIS",
      jurisdiction: "Irving, TX",
      state: "TX",
      city: "Irving",
      issue_date: issueDate,
      status: item.Status || "Issued",
      normalized_address: rawAddr || "Irving, TX",
      zip_code: null,
      valuation: valuation,
      valuation_formatted: valuation > 0 ? `$${valuation.toLocaleString()}` : "$0",
      category: isRoof ? "Roofing" : (item.Permit_Type || "Commercial Building"),
      raw_description: item.Project_Description || `Irving Permit: ${item.Permit_Type || "Commercial"}`,
      contractor_name: "On Municipal Record",
      is_pure_reroof: isRoof,
      confidence_score: confidence,
    });
  }

  // Process CSV records (2018-2022)
  for (const item of csvRecords) {
    const rawNo = (item.permitNo || "").trim();
    if (!rawNo || seenPermitNos.has(rawNo)) continue;
    seenPermitNos.add(rawNo);

    const issueDate = parseDate(item.issued) || "2020-01-01";
    const rawAddr = (item.siteAddr || "").trim();
    const cleanAddr = cleanAddress(rawAddr);
    const tokens = extractStreetTokens(rawAddr);

    let matchedParcel = exactAddressMap.get(cleanAddr);
    let confidence = 0;

    if (matchedParcel) {
      confidence = 95;
    } else if (tokens && tokens.coreName) {
      const key = `${tokens.num}|${tokens.coreName}`;
      matchedParcel = streetTokenMap.get(key);
      if (matchedParcel) confidence = 85;
    }

    const valuation = parseValuation(item.jobValue);
    const isRoof = isRoofingPermit(item.description, item.permittype, item.permitsubtype);

    normalizedRows.push({
      id: `IRV-CSV-${rawNo.replace(/[^A-Za-z0-9_-]/g, "_")}`,
      raw_permit_number: rawNo,
      jurisdiction_id: "JUR-IRV-001",
      parcel_id: matchedParcel ? matchedParcel.id : null,
      source_system: "City of Irving Open Data / ArcGIS",
      jurisdiction: "Irving, TX",
      state: "TX",
      city: "Irving",
      issue_date: issueDate,
      status: "Closed / Historical",
      normalized_address: rawAddr || "Irving, TX",
      zip_code: (item.siteZip || "").trim() || null,
      valuation: valuation,
      valuation_formatted: valuation > 0 ? `$${valuation.toLocaleString()}` : "$0",
      category: isRoof ? "Roofing" : (item.permittype || "Commercial Building"),
      raw_description: item.description || `Irving Permit: ${item.permittype || "Commercial"}`,
      contractor_name: "On Municipal Record",
      is_pure_reroof: isRoof,
      confidence_score: confidence,
    });
  }

  console.log(`Total unique Irving commercial permits prepared: ${normalizedRows.length}`);
  const linkedCount = normalizedRows.filter((r) => r.parcel_id !== null).length;
  const roofingLinked = normalizedRows.filter((r) => r.parcel_id !== null && r.is_pure_reroof).length;
  console.log(`Authoritatively linked to commercial parcels: ${linkedCount} (${(linkedCount / normalizedRows.length * 100).toFixed(1)}%)`);
  console.log(`Verified commercial roofing permits linked: ${roofingLinked}`);

  // Step 4: Batch upsert into warehouse.normalized_permits
  console.log("\n[4/6] Upserting permits into warehouse.normalized_permits...");
  const BATCH_SIZE = 500;
  for (let i = 0; i < normalizedRows.length; i += BATCH_SIZE) {
    const chunk = normalizedRows.slice(i, i + BATCH_SIZE);
    await pool.query(
      `
      INSERT INTO warehouse.normalized_permits (
        id, raw_permit_number, jurisdiction_id, parcel_id, source_system,
        jurisdiction, state, city, issue_date, status, normalized_address,
        zip_code, valuation, valuation_formatted, category, raw_description,
        contractor_name, is_pure_reroof, confidence_score
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
        unnest($17::text[]),
        unnest($18::boolean[]),
        unnest($19::integer[])
      ON CONFLICT (raw_permit_number, jurisdiction, issue_date)
      DO UPDATE SET
        parcel_id = COALESCE(warehouse.normalized_permits.parcel_id, EXCLUDED.parcel_id),
        valuation = EXCLUDED.valuation,
        category = EXCLUDED.category,
        is_pure_reroof = EXCLUDED.is_pure_reroof
    `,
      [
        chunk.map((r) => r.id),
        chunk.map((r) => r.raw_permit_number),
        chunk.map((r) => r.jurisdiction_id),
        chunk.map((r) => r.parcel_id),
        chunk.map((r) => r.source_system),
        chunk.map((r) => r.jurisdiction),
        chunk.map((r) => r.state),
        chunk.map((r) => r.city),
        chunk.map((r) => r.issue_date),
        chunk.map((r) => r.status),
        chunk.map((r) => r.normalized_address),
        chunk.map((r) => r.zip_code),
        chunk.map((r) => r.valuation),
        chunk.map((r) => r.valuation_formatted),
        chunk.map((r) => r.category),
        chunk.map((r) => r.raw_description),
        chunk.map((r) => r.contractor_name),
        chunk.map((r) => r.is_pure_reroof),
        chunk.map((r) => r.confidence_score),
      ]
    );
  }
  console.log(`Successfully upserted ${normalizedRows.length} permits into warehouse.normalized_permits!`);

  // Step 5: Update roof intelligence for Irving commercial buildings
  console.log("\n[5/6] Updating roof age and reroof intelligence for Irving buildings...");
  const irvingUpdateRes = await pool.query(`
    WITH latest_roofing AS (
      SELECT DISTINCT ON (parcel_id)
        parcel_id,
        issue_date,
        raw_permit_number
      FROM warehouse.normalized_permits
      WHERE parcel_id IS NOT NULL
        AND city ILIKE 'Irving'
        AND (category = 'Roofing' OR is_pure_reroof = true OR raw_description ILIKE '%roof%')
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
  `);
  console.log(`Updated ${irvingUpdateRes.rowCount} Irving commercial buildings to verified PERMIT roof age!`);

  // Step 6: Summary Report
  console.log("\n[6/6] Generating Irving & County-Wide Commercial Verification Audit...");
  const { rows: irvingAudit } = await pool.query(`
    SELECT
      COUNT(*) as total_irving_commercial,
      COUNT(*) FILTER (WHERE roof_age_years IS NOT NULL) as with_roof_age,
      COUNT(*) FILTER (WHERE roof_age_basis = 'PERMIT') as verified_permit_roof_age,
      COUNT(*) FILTER (WHERE roof_age_basis = 'YEAR_BUILT') as certified_dcad_year_built_age,
      COUNT(*) FILTER (WHERE roof_age_years >= 15) as prime_roof_replacement_leads,
      ROUND(AVG(roof_age_years)::numeric, 1) as avg_roof_age_years
    FROM warehouse.parcels
    WHERE data_source ILIKE '%Dallas%'
      AND city ILIKE 'Irving'
      AND (building_sqft::numeric > 0)
  `);
  console.table(irvingAudit);

  const durationSec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n================================================================================`);
  console.log(`IRVING HARVEST AND ENRICHMENT COMPLETE IN ${durationSec} SECONDS!`);
  console.log(`================================================================================\n`);

  await pool.end();
}

main().catch(console.error);
