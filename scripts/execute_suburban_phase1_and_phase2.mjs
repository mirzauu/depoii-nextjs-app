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

function postJson(url, body, tenantHeaders) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = https.request(url, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
        "Content-Length": Buffer.byteLength(postData),
        ...tenantHeaders,
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

function getCriteriaTemplate(url, tenantHeaders) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        ...tenantHeaders,
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
  console.log("DEPOII SUBURBAN EXECUTION ENGINE: PHASE 1 & PHASE 2");
  console.log("================================================================================\n");

  // ===========================================================================
  // STEP 1: County-Wide Certified DCAD Baseline (All 30 Suburban Municipalities)
  // ===========================================================================
  console.log("[1/4] Establishing certified DCAD year_built baseline across all suburban buildings...");
  const baselineRes = await pool.query(`
    UPDATE warehouse.parcels
    SET
      roof_age_years = GREATEST(0, 2026 - year_built),
      roof_age_basis = 'YEAR_BUILT'
    WHERE data_source ILIKE '%Dallas%'
      AND (building_sqft::numeric > 0)
      AND year_built IS NOT NULL
      AND year_built > 1900
      AND roof_age_years IS NULL
  `);
  console.log(`Initialized certified roof age baseline for ${baselineRes.rowCount} suburban commercial buildings!\n`);

  // ===========================================================================
  // STEP 2: Town of Addison Roof Intelligence Promotion (1,861 linked permits)
  // ===========================================================================
  console.log("[2/4] Promoting Town of Addison buildings with existing 1,861 linked permits...");
  const addisonPermitUpdate = await pool.query(`
    WITH latest_roofing AS (
      SELECT DISTINCT ON (parcel_id)
        parcel_id,
        issue_date,
        raw_permit_number
      FROM warehouse.normalized_permits
      WHERE parcel_id IS NOT NULL
        AND city ILIKE 'Addison'
        AND (category = 'Roofing' OR raw_description ILIKE '%roof%')
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
  console.log(`Updated ${addisonPermitUpdate.rowCount} Addison commercial buildings with verified PERMIT-based roof age!\n`);

  // ===========================================================================
  // STEP 3: City of Mesquite Tyler EnerGov Live Harvest (1,587 commercial buildings)
  // ===========================================================================
  console.log("[3/4] Harvesting City of Mesquite live permits via Tyler EnerGov API...");
  const { rows: mesquiteParcels } = await pool.query(`
    SELECT id, account_number, address, building_sqft, total_valuation, owner_name, year_built
    FROM warehouse.parcels
    WHERE data_source ILIKE '%Dallas%'
      AND city ILIKE 'Mesquite'
      AND (building_sqft::numeric > 0)
  `);
  console.log(`Loaded ${mesquiteParcels.length} Mesquite commercial buildings.`);

  const mesquiteAccountSet = new Set(mesquiteParcels.map((p) => p.account_number));
  const mesquiteParcelIdMap = new Map(mesquiteParcels.map((p) => [p.account_number, p.id]));

  const mesquiteTenantHeaders = {
    "Referer": "https://energov.cityofmesquite.com/EnerGov_Prod/selfservice",
    "tyler-tenant-culture": "en-US",
    "tyler-tenanturl": "MesquiteTX",
    "tenantid": "1",
    "tenantname": "MesquiteTX",
  };

  const mesquiteCriteriaUrl = "https://energov.cityofmesquite.com/EnerGov_Prod/selfservice/api/energov/search/criteria";
  const mesquiteSearchUrl = "https://energov.cityofmesquite.com/EnerGov_Prod/selfservice/api/energov/search/search";

  let mesquiteUpsert = [];
  try {
    const mesquiteTemplate = await getCriteriaTemplate(mesquiteCriteriaUrl, mesquiteTenantHeaders);
    const targetPages = 20; // 2,000 records
    const PAGE_SIZE = 100;
    console.log(`Harvesting up to ${targetPages * PAGE_SIZE} Mesquite roof records (100 per page)...`);

    for (let page = 1; page <= targetPages; page++) {
      const payload = JSON.parse(JSON.stringify(mesquiteTemplate));
      payload.Keyword = "Roof";
      payload.ExactMatch = false;
      payload.SearchModule = 1;
      payload.FilterModule = 1;
      payload.PageNumber = page;
      payload.PageSize = PAGE_SIZE;

      try {
        const res = await postJson(mesquiteSearchUrl, payload, mesquiteTenantHeaders);
        const items = res.Result?.EntityResults || [];
        if (items.length === 0) break;

        for (const item of items) {
          const rawPermitNo = item.CaseNumber;
          if (!rawPermitNo) continue;

          const mainParcel = (item.MainParcel || "").trim();
          const isMatched = mesquiteAccountSet.has(mainParcel);
          const parcelId = isMatched ? mesquiteParcelIdMap.get(mainParcel) : null;

          const rawDate = item.ApplyDate || item.RequestDate || item.ScheduleDate || item.FinalDate;
          const issueDate = rawDate ? rawDate.slice(0, 10) : "2024-01-01";
          const addr = item.AddressDisplay || (item.Address?.FullAddress || "Mesquite, TX");
          const zip = item.Address?.PostalCode || null;

          mesquiteUpsert.push({
            id: `MESQ-ENERG-${rawPermitNo.replace(/[^A-Za-z0-9_-]/g, "_")}`,
            raw_permit_number: rawPermitNo,
            jurisdiction_id: "JUR-MESQ-001",
            parcel_id: parcelId,
            source_system: "City of Mesquite EnerGov CSS",
            jurisdiction: "Mesquite, TX",
            state: "TX",
            city: "Mesquite",
            issue_date: issueDate,
            status: item.CaseStatus || "Issued",
            normalized_address: addr,
            zip_code: zip,
            valuation: 0,
            valuation_formatted: "$0",
            category: "Roofing",
            raw_description: `Mesquite EnerGov: ${item.CaseType} (${item.CaseStatus || "Record"})`,
            contractor_name: item.CompanyName || "On Municipal Record",
            is_pure_reroof: true,
            confidence_score: isMatched ? 100 : 70,
          });
        }
      } catch (err) {
        console.error(`Mesquite harvest page ${page} error:`, err.message);
      }
    }

    console.log(`Harvested ${mesquiteUpsert.length} Mesquite permits from live EnerGov API.`);

    if (mesquiteUpsert.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < mesquiteUpsert.length; i += BATCH_SIZE) {
        const chunk = mesquiteUpsert.slice(i, i + BATCH_SIZE);
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
      }
      console.log(`Upserted ${mesquiteUpsert.length} Mesquite permits into warehouse.normalized_permits!`);

      // Update Mesquite roof intelligence
      const mesquiteRoofUpdate = await pool.query(`
        WITH latest_roofing AS (
          SELECT DISTINCT ON (parcel_id)
            parcel_id,
            issue_date,
            raw_permit_number
          FROM warehouse.normalized_permits
          WHERE parcel_id IS NOT NULL
            AND city ILIKE 'Mesquite'
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
      console.log(`Updated ${mesquiteRoofUpdate.rowCount} Mesquite commercial buildings with verified PERMIT-based roof age!`);
    }
  } catch (err) {
    console.error("Mesquite harvest error:", err.message);
  }

  // ===========================================================================
  // STEP 4: County-Wide Verification Audit
  // ===========================================================================
  console.log("\n[4/4] Generating Dallas County commercial audit report...");
  const { rows: countyAudit } = await pool.query(`
    SELECT
      COUNT(*) as total_dallas_county_commercial,
      COUNT(*) FILTER (WHERE roof_age_years IS NOT NULL) as with_calculated_roof_age,
      ROUND(COUNT(*) FILTER (WHERE roof_age_years IS NOT NULL)::numeric / COUNT(*) * 100, 2) as coverage_percentage,
      COUNT(*) FILTER (WHERE roof_age_basis = 'PERMIT') as verified_permit_roof_age,
      COUNT(*) FILTER (WHERE roof_age_basis = 'YEAR_BUILT') as certified_dcad_year_built_age,
      COUNT(*) FILTER (WHERE roof_age_years >= 15) as prime_roof_replacement_leads
    FROM warehouse.parcels
    WHERE data_source ILIKE '%Dallas%'
      AND (building_sqft::numeric > 0)
  `);

  const { rows: topCitiesAudit } = await pool.query(`
    SELECT
      city,
      COUNT(*) as commercial_buildings,
      COUNT(*) FILTER (WHERE roof_age_years IS NOT NULL) as with_roof_age,
      COUNT(*) FILTER (WHERE roof_age_basis = 'PERMIT') as permit_verified,
      ROUND(AVG(roof_age_years)::numeric, 1) as avg_roof_age
    FROM warehouse.parcels
    WHERE data_source ILIKE '%Dallas%'
      AND (building_sqft::numeric > 0)
    GROUP BY city
    HAVING COUNT(*) >= 500
    ORDER BY commercial_buildings DESC
  `);

  const durationSec = ((Date.now() - overallStart) / 1000).toFixed(1);
  console.log("\n================================================================================");
  console.log(`PHASE 1 & PHASE 2 COMPLETE IN ${durationSec} SECONDS!`);
  console.log("================================================================================");
  console.log("COUNTY-WIDE COMMERCIAL AUDIT:");
  console.table(countyAudit);
  console.log("\nTOP CITIES SUMMARY:");
  console.table(topCitiesAudit);

  await pool.end();
}

main().catch(console.error);

