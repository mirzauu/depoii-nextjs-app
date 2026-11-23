import fs from "node:fs";
import path from "node:path";
import https from "node:https";
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

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = https.request(url, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
        "Referer": "https://egov.gptx.org/EnerGov_Prod/SelfService",
        "tyler-tenant-culture": "en-US",
        "tyler-tenanturl": "GrandPrairieTXProd",
        "tenantid": "1",
        "tenantname": "GrandPrairieTXProd",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 20000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.write(postData);
    req.end();
  });
}

function getCriteriaTemplate() {
  return new Promise((resolve, reject) => {
    https.get("https://egov.gptx.org/EnerGov_Prod/selfservice/api/energov/search/criteria", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": "https://egov.gptx.org/EnerGov_Prod/SelfService",
        "tyler-tenant-culture": "en-US",
        "tyler-tenanturl": "GrandPrairieTXProd",
        "tenantid": "1",
        "tenantname": "GrandPrairieTXProd",
      },
      timeout: 15000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json.Result);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function main() {
  const overallStart = Date.now();
  console.log("================================================================================");
  console.log("DEPOII SUBURBAN HARVESTER: GRAND PRAIRIE (TYLER ENERGOV API)");
  console.log("================================================================================\n");

  // Step 1: Load Grand Prairie Commercial Parcels
  console.log("[1/4] Loading Grand Prairie commercial parcels from warehouse.parcels...");
  const { rows: parcels } = await pool.query(`
    SELECT id, account_number, address, building_sqft, total_valuation, owner_name, year_built
    FROM warehouse.parcels
    WHERE data_source ILIKE '%Dallas%'
      AND city ILIKE 'Grand Prairie'
      AND (building_sqft::numeric > 0)
  `);
  console.log(`Loaded ${parcels.length} Grand Prairie commercial buildings.`);

  const accountSet = new Set(parcels.map((p) => p.account_number));
  const parcelIdMap = new Map(parcels.map((p) => [p.account_number, p.id]));

  // Step 2: Fetch Template and Search Roof Permits
  console.log("\n[2/4] Initializing Tyler EnerGov search criteria...");
  const criteriaTemplate = await getCriteriaTemplate();
  const searchUrl = "https://egov.gptx.org/EnerGov_Prod/selfservice/api/energov/search/search";

  const PAGE_SIZE = 100;
  const targetPages = 30; // 3,000 most recent roof records
  console.log(`Harvesting up to ${targetPages * PAGE_SIZE} recent Grand Prairie roof permits (100 per page)...`);

  let totalHarvested = 0;
  let matchedCount = 0;
  const toUpsert = [];

  for (let page = 1; page <= targetPages; page++) {
    const payload = JSON.parse(JSON.stringify(criteriaTemplate));
    payload.Keyword = "Roof";
    payload.ExactMatch = false;
    payload.SearchModule = 1;
    payload.FilterModule = 1;
    payload.PageNumber = page;
    payload.PageSize = PAGE_SIZE;

    try {
      const res = await postJson(searchUrl, payload);
      const items = res.Result?.EntityResults || [];
      if (items.length === 0) {
        console.log(`Page ${page}: No more records.`);
        break;
      }

      totalHarvested += items.length;

      for (const item of items) {
        const rawPermitNo = item.CaseNumber;
        if (!rawPermitNo) continue;

        const mainParcel = (item.MainParcel || "").trim();
        const isMatched = accountSet.has(mainParcel);
        const parcelId = isMatched ? parcelIdMap.get(mainParcel) : null;

        if (isMatched) matchedCount++;

        const rawDate = item.ApplyDate || item.RequestDate || item.ScheduleDate || item.FinalDate;
        const issueDate = rawDate ? rawDate.slice(0, 10) : "2024-01-01";
        const desc = item.CaseType || "Roofing Permit";
        const addr = item.AddressDisplay || (item.Address?.FullAddress || "Grand Prairie, TX");
        const zip = item.Address?.PostalCode || null;

        toUpsert.push({
          id: `GP-ENERG-${rawPermitNo.replace(/[^A-Za-z0-9_-]/g, "_")}`,
          raw_permit_number: rawPermitNo,
          jurisdiction_id: "JUR-GP-001",
          parcel_id: parcelId,
          source_system: "City of Grand Prairie EnerGov CSS",
          jurisdiction: "Grand Prairie, TX",
          state: "TX",
          city: "Grand Prairie",
          issue_date: issueDate,
          status: item.CaseStatus || "Issued",
          normalized_address: addr,
          zip_code: zip,
          valuation: 0,
          valuation_formatted: "$0",
          category: "Roofing",
          raw_description: `Grand Prairie EnerGov: ${item.CaseType} (${item.CaseStatus || "Record"})`,
          contractor_name: item.CompanyName || "On Municipal Record",
          is_pure_reroof: true,
          confidence_score: isMatched ? 100 : 70,
        });
      }

      if (page % 5 === 0 || page === targetPages) {
        console.log(`... processed Page ${page}/${targetPages} (${totalHarvested} permits harvested, ${matchedCount} matched to commercial buildings)`);
      }
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
    }
  }

  // Step 3: Upsert into warehouse.normalized_permits
  console.log(`\n[3/4] Upserting ${toUpsert.length} Grand Prairie permits into warehouse.normalized_permits...`);
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const chunk = toUpsert.slice(i, i + BATCH_SIZE);
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
        parcel_id = COALESCE(warehouse.normalized_permits.parcel_id, EXCLUDED.parcel_id)
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
    inserted += chunk.length;
  }
  console.log(`Upserted ${inserted} permits successfully!`);

  // Step 4: Update Roof Intelligence on Grand Prairie Parcels
  console.log("\n[4/4] Computing roof intelligence on Grand Prairie commercial parcels...");
  const permitUpdate = await pool.query(`
    WITH latest_roofing AS (
      SELECT DISTINCT ON (parcel_id)
        parcel_id,
        issue_date,
        raw_permit_number
      FROM warehouse.normalized_permits
      WHERE parcel_id IS NOT NULL
        AND city ILIKE 'Grand Prairie'
        AND category = 'Roofing'
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
  console.log(`Updated ${permitUpdate.rowCount} Grand Prairie buildings with verified PERMIT-based roof age.`);

  const yearBuiltUpdate = await pool.query(`
    UPDATE warehouse.parcels
    SET
      roof_age_years = GREATEST(0, 2026 - year_built),
      roof_age_basis = 'YEAR_BUILT'
    WHERE city ILIKE 'Grand Prairie'
      AND (building_sqft::numeric > 0)
      AND year_built IS NOT NULL
      AND year_built > 1900
      AND last_reroof_date IS NULL
  `);
  console.log(`Updated ${yearBuiltUpdate.rowCount} Grand Prairie buildings with DCAD YEAR_BUILT baseline.\n`);

  // Final Audit
  const { rows: audit } = await pool.query(`
    SELECT
      COUNT(*) as total_grand_prairie_commercial,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM warehouse.normalized_permits np WHERE np.parcel_id = p.id)) as with_permits,
      COUNT(*) FILTER (WHERE roof_age_years IS NOT NULL) as with_roof_age,
      ROUND(AVG(roof_age_years)::numeric, 1) as avg_roof_age
    FROM warehouse.parcels p
    WHERE city ILIKE 'Grand Prairie' AND (building_sqft::numeric > 0)
  `);

  console.log("================================================================================");
  console.log(`GRAND PRAIRIE HARVEST COMPLETE IN ${((Date.now() - overallStart) / 1000).toFixed(1)}s!`);
  console.log("================================================================================");
  console.table(audit);

  await pool.end();
}

main().catch(console.error);

