/**
 * Dallas Socrata Open Data API (SODA) Federation Engine
 * 
 * Federates City of Dallas Open Data across 4 Socrata datasets covering
 * October 2012 / 2013 through Today (2026):
 * 1. Live Master (2018–Present): e7gq-4sah (Updated Daily)
 * 2. FY 2017–2018 Archive: w2uy-zn9f
 * 3. FY 2015–2016 Archive: rzm4-tcqx
 * 4. FY 2013–2014 Archive: fs84-rv8z
 */

import { TradeCategory } from "@/lib/types";

export interface PublicPermit {
  permit_number: string;
  issued_date: string | null;
  trade: TradeCategory;
  subdiscipline: string;
  permit_type: string | null;
  contractor: string | null;
  valuation: number | null;
  valuation_formatted: string | null;
  work_description: string | null;
  land_use: string | null;
  street_address: string | null;
  zip_code: string | null;
  area_sqft: number | null;
  source_dataset_id: string;
  source_dataset_name: string;
  is_live_dataset: boolean;
}

export interface PublicPermitHistoryResponse {
  query: {
    address?: string;
    permit_number?: string;
    since?: string;
    trade?: string;
  };
  summary: {
    total_permits: number;
    earliest_date: string | null;
    latest_date: string | null;
    total_valuation: number;
    total_valuation_formatted: string;
    trades_breakdown: Record<string, number>;
  };
  permits: PublicPermit[];
  sources_queried: {
    id: string;
    name: string;
    status: "ok" | "error" | "skipped";
    permits_found: number;
    error_message?: string;
  }[];
}

interface SocrataDatasetConfig {
  id: string;
  name: string;
  minYear: number;
  maxYear: number;
  isLive: boolean;
}

export const DALLAS_SOCRATA_DATASETS: SocrataDatasetConfig[] = [
  {
    id: "e7gq-4sah",
    name: "Dallas Open Data Master (Live 2018-Present)",
    minYear: 2018,
    maxYear: 9999,
    isLive: true,
  },
  {
    id: "w2uy-zn9f",
    name: "Dallas Open Data FY 2017-2018 Archive",
    minYear: 2016,
    maxYear: 2018,
    isLive: false,
  },
  {
    id: "rzm4-tcqx",
    name: "Dallas Open Data FY 2015-2016 Archive",
    minYear: 2014,
    maxYear: 2016,
    isLive: false,
  },
  {
    id: "fs84-rv8z",
    name: "Dallas Open Data FY 2013-2014 Archive",
    minYear: 2012,
    maxYear: 2014,
    isLive: false,
  },
];

/**
 * Normalizes dates from various Socrata formats (MM/DD/YY, ISO string, etc.) into YYYY-MM-DD.
 */
export function normalizePermitDate(rawDate?: string | null): string | null {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  if (!str) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // MM/DD/YY or MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (mdy) {
    let [_, m, d, y] = mdy;
    m = m.padStart(2, "0");
    d = d.padStart(2, "0");
    if (y.length === 2) {
      const yrNum = parseInt(y, 10);
      y = yrNum > 50 ? `19${y}` : `20${y}`;
    }
    return `${y}-${m}-${d}`;
  }

  // ISO string (e.g. 2014-09-16T00:00:00.000)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Normalizes valuation values (removes $, commas, handles scientific or text).
 */
export function normalizeValuation(val?: string | number | null): { num: number | null; formatted: string | null } {
  if (val === null || val === undefined) return { num: null, formatted: null };
  if (typeof val === "number") {
    if (!Number.isFinite(val) || val <= 0) return { num: 0, formatted: "$0" };
    return { num: Math.round(val), formatted: `$${Math.round(val).toLocaleString()}` };
  }

  const cleaned = String(val).replace(/[^0-9.]/g, "");
  if (!cleaned) return { num: null, formatted: null };
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return { num: null, formatted: null };
  const rounded = Math.round(num);
  return { num: rounded, formatted: `$${rounded.toLocaleString()}` };
}

/**
 * Cleans street address for resilient token matching in SoQL.
 * E.g. "2100 Ross Ave, Ste 400, Dallas, TX 75201" -> { streetNumber: "2100", streetTokens: ["ROSS"] }
 */
export function parseAddressTokens(rawAddress: string): {
  streetNumber: string | null;
  streetTokens: string[];
} {
  let clean = rawAddress.toUpperCase();

  // Strip state, county, zip code, suite, unit
  clean = clean.replace(/,\s*DALLAS\b.*$/i, "");
  clean = clean.replace(/,\s*TX\b.*$/i, "");
  clean = clean.replace(/\b\d{5}(-\d{4})?\b/g, "");
  clean = clean.replace(/\b(STE|SUITE|UNIT|BLDG|BUILDING|APT|#|FL|FLOOR)\b.*$/i, "");

  // Extract leading or isolated house/street number
  const numMatch = clean.match(/\b(\d+)\b/);
  const streetNumber = numMatch ? numMatch[1] : null;

  // Remove street suffixes and noise words
  const noise = [
    "AVE", "AVENUE", "ST", "STREET", "BLVD", "BOULEVARD", "RD", "ROAD",
    "DR", "DRIVE", "PKWY", "PARKWAY", "HWY", "HIGHWAY", "LN", "LANE",
    "WAY", "CT", "COURT", "CIR", "CIRCLE", "PL", "PLACE", "TER", "TERRACE",
    "EXPY", "EXPRESSWAY", "FREEWAY", "FWY", "TX", "TEXAS", "DALLAS"
  ];

  const directionals = ["N", "S", "E", "W", "NE", "NW", "SE", "SW"];
  const words = clean
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => (w.length > 1 || directionals.includes(w)) && !noise.includes(w) && w !== streetNumber);

  return {
    streetNumber,
    streetTokens: words,
  };
}

/**
 * Classifies a permit record into one of 8 canonical commercial trades and subdiscipline.
 */
export function classifyTrade(
  workDesc?: string | null,
  permitType?: string | null
): { trade: TradeCategory; subdiscipline: string } {
  const text = `${workDesc || ""} ${permitType || ""}`.toLowerCase();

  // 1. Solar & Photovoltaic (highest priority - rooftop solar is electrical_solar, not roofing)
  if (/solar|photovoltaic|pv array/.test(text)) {
    return { trade: "electrical_solar", subdiscipline: "solar_pv" };
  }

  // 2. HVAC & Mechanical (rooftop units / AC units take precedence over generic "roof")
  if (
    /hvac|mechanical|chiller|cooling tower|rtu|rooftop unit|rooftop ac|rooftop hvac|air condition|furnace|condenser|ductwork|ventilation|air handling|exhaust fan|compressor|refrigeration/.test(text)
  ) {
    let sub = "general_mechanical";
    if (/rtu|rooftop unit|rooftop ac|packaged unit/.test(text)) sub = "rtu_replacement";
    else if (/chiller|cooling tower/.test(text)) sub = "chiller_cooling_tower";
    else if (/split system|condenser|heat pump/.test(text)) sub = "split_system_condenser";
    else if (/duct|ventilation|exhaust/.test(text)) sub = "ductwork_ventilation";
    else if (/boiler|heating/.test(text)) sub = "boiler_heating";
    return { trade: "hvac", subdiscipline: sub };
  }

  // 3. Roofing & Waterproofing
  if (
    /roof|reroof|re-roof|tpo|epdm|shingle|membrane|coating|single-ply|tar and gravel|mod-bit|modified bitumen|parapet/.test(text) &&
    !/roof drain|roof hatch/.test(text)
  ) {
    let sub = "general_roofing";
    if (/tear off|replacement|replace roof|reroof|re-roof/.test(text)) sub = "replacement";
    else if (/coating|silicone|acrylic|elastomeric/.test(text)) sub = "coating";
    else if (/repair|patch|leak/.test(text)) sub = "repair";
    else if (/tpo|epdm|single-ply|membrane/.test(text)) sub = "membrane";
    else if (/shingle/.test(text)) sub = "shingle";
    else if (/metal/.test(text)) sub = "metal";
    return { trade: "roofing", subdiscipline: sub };
  }

  // 4. Electrical
  if (/electrical|electric|lighting|switchgear|transformer|ev charger|ev charging|generator|panel upgrade|service upgrade|feeder|conduit/.test(text)) {
    let sub = "general_electrical";
    if (/ev charger|ev charging|electric vehicle/.test(text)) sub = "ev_charging";
    else if (/generator/.test(text)) sub = "generator";
    else if (/panel|switchgear|service upgrade/.test(text)) sub = "panel_upgrade";
    else if (/light|fixture|led/.test(text)) sub = "lighting";
    return { trade: "electrical_solar", subdiscipline: sub };
  }

  // 5. Plumbing
  if (/plumbing|plumb|water heater|boiler|backflow|grease trap|sewer|water service|water main|gas pipe|gas line|drain|drainage|fixture/.test(text)) {
    let sub = "fixture_piping";
    if (/water heater|boiler/.test(text)) sub = "water_heater_boiler";
    else if (/backflow|grease trap/.test(text)) sub = "backflow_grease_trap";
    else if (/sewer|water main|water service/.test(text)) sub = "sewer_water_main";
    return { trade: "plumbing", subdiscipline: sub };
  }

  // 6. Fire Safety
  if (/fire|sprinkler|riser|fire alarm|suppression|smoke detector|standpipe|hydrant/.test(text)) {
    let sub = "suppression_system";
    if (/sprinkler|riser|head/.test(text)) sub = "fire_sprinkler";
    else if (/alarm|panel|strobe|detector/.test(text)) sub = "fire_alarm";
    return { trade: "fire_safety", subdiscipline: sub };
  }

  // 7. Elevators
  if (/elevator|escalator|lift|hoistway|dumbwaiter|vertical transport/.test(text)) {
    let sub = "passenger_elevator";
    if (/freight/.test(text)) sub = "freight_elevator";
    else if (/modernization|modernize/.test(text)) sub = "modernization";
    return { trade: "elevators", subdiscipline: sub };
  }

  // 8. Paving & Civil
  if (/paving|asphalt|parking lot|sealcoat|striping|concrete flatwork|curb|gutter|sidewalk|driveway|grading|retaining wall/.test(text)) {
    let sub = "parking_lot_repair";
    if (/asphalt|resurface|overlay/.test(text)) sub = "asphalt_paving";
    else if (/concrete|flatwork|curb/.test(text)) sub = "concrete_flatwork";
    return { trade: "paving_civil", subdiscipline: sub };
  }

  // 9. General Construction / Default
  let sub = "tenant_improvement";
  if (/demolition|demo/.test(text)) sub = "demolition";
  else if (/addition|expansion/.test(text)) sub = "addition";
  else if (/new construction|new building|ground up/.test(text)) sub = "new_construction";
  else if (/renovation|remodel|alteration/.test(text)) sub = "remodel";

  return { trade: "general_construction", subdiscipline: sub };
}

/**
 * Builds SoQL WHERE clause for Dallas Socrata datasets.
 */
function buildSoqlWhere(
  streetNumber: string | null,
  streetTokens: string[],
  permitNumber?: string,
  sinceDate?: string
): string {
  const clauses: string[] = [];

  if (permitNumber) {
    clauses.push(`upper(permit_number) = '${permitNumber.trim().toUpperCase()}'`);
    return clauses.join(" and ");
  }

  if (streetNumber) {
    clauses.push(`upper(street_address) like '%${streetNumber}%'`);
  }

  for (const token of streetTokens) {
    if (token.length >= 2) {
      clauses.push(`upper(street_address) like '%${token}%'`);
    }
  }

  return clauses.join(" and ");
}

/**
 * Main query function: Federates across Dallas Socrata datasets from 2013 to present.
 */
export async function queryDallasPublicPermitHistory(params: {
  address?: string;
  permit_number?: string;
  since?: string;
  trade?: string;
  limit?: number;
}): Promise<PublicPermitHistoryResponse> {
  const sinceDate = params.since || "2013-01-01";
  const sinceYear = parseInt(sinceDate.slice(0, 4), 10) || 2013;
  const maxLimit = Math.min(Math.max(params.limit || 100, 1), 500);

  let streetNumber: string | null = null;
  let streetTokens: string[] = [];

  if (params.address) {
    const parsed = parseAddressTokens(params.address);
    streetNumber = parsed.streetNumber;
    streetTokens = parsed.streetTokens;
  }

  const whereClause = buildSoqlWhere(streetNumber, streetTokens, params.permit_number, sinceDate);

  // If no searchable terms could be extracted
  if (!whereClause) {
    return {
      query: { ...params, since: sinceDate },
      summary: {
        total_permits: 0,
        earliest_date: null,
        latest_date: null,
        total_valuation: 0,
        total_valuation_formatted: "$0",
        trades_breakdown: {},
      },
      permits: [],
      sources_queried: [],
    };
  }

  // Filter datasets by requested sinceYear
  const eligibleDatasets = DALLAS_SOCRATA_DATASETS.filter(
    (ds) => ds.maxYear >= sinceYear
  );

  const appToken = process.env.SOCRATA_APP_TOKEN || "";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (appToken) {
    headers["X-App-Token"] = appToken;
  }

  // Execute federated fetch in parallel
  const fetchPromises = eligibleDatasets.map(async (ds) => {
    const url = new URL(`https://www.dallasopendata.com/resource/${ds.id}.json`);
    url.searchParams.set("$where", whereClause);
    url.searchParams.set("$order", "issued_date DESC");
    url.searchParams.set("$limit", String(maxLimit));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    try {
      const resp = await fetch(url.toString(), {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        throw new Error(`Socrata HTTP ${resp.status}: ${resp.statusText}`);
      }

      const rows: any[] = await resp.json();
      return {
        ds,
        status: "ok" as const,
        rows: Array.isArray(rows) ? rows : [],
        error: undefined,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      return {
        ds,
        status: "error" as const,
        rows: [],
        error: err?.name === "AbortError" ? "Request timeout (6s)" : String(err?.message || err),
      };
    }
  });

  const datasetResults = await Promise.all(fetchPromises);

  // Combine, normalize, and filter records
  const rawPermits: PublicPermit[] = [];
  const sourcesQueried: PublicPermitHistoryResponse["sources_queried"] = [];
  const seenPermitNos = new Set<string>();

  for (const res of datasetResults) {
    sourcesQueried.push({
      id: res.ds.id,
      name: res.ds.name,
      status: res.status,
      permits_found: res.rows.length,
      error_message: res.error,
    });

    for (const r of res.rows) {
      const permitNo = String(r.permit_number || "").trim();
      if (!permitNo) continue;

      // Deduplicate across dataset boundaries (e.g. FY boundary overlap)
      if (seenPermitNos.has(permitNo)) continue;
      seenPermitNos.add(permitNo);

      const parsedDate = normalizePermitDate(r.issued_date);

      // Apply date threshold if normalized date is available
      if (parsedDate && parsedDate < sinceDate) {
        continue;
      }

      const workDesc = r.work_description || null;
      const permitType = r.permit_type || null;
      const { trade, subdiscipline } = classifyTrade(workDesc, permitType);

      // Apply optional trade filter
      if (params.trade && params.trade !== "all" && trade !== params.trade) {
        continue;
      }

      const valNorm = normalizeValuation(r.value);
      const area = r.area ? parseFloat(String(r.area).replace(/[^0-9.]/g, "")) : null;

      rawPermits.push({
        permit_number: permitNo,
        issued_date: parsedDate,
        trade,
        subdiscipline,
        permit_type: permitType,
        contractor: r.contractor ? String(r.contractor).trim() : null,
        valuation: valNorm.num,
        valuation_formatted: valNorm.formatted,
        work_description: workDesc,
        land_use: r.land_use || null,
        street_address: r.street_address ? String(r.street_address).trim() : null,
        zip_code: r.zip_code || null,
        area_sqft: Number.isFinite(area) ? area : null,
        source_dataset_id: res.ds.id,
        source_dataset_name: res.ds.name,
        is_live_dataset: res.ds.isLive,
      });
    }
  }

  // Sort chronologically descending
  rawPermits.sort((a, b) => {
    if (!a.issued_date) return 1;
    if (!b.issued_date) return -1;
    return b.issued_date.localeCompare(a.issued_date);
  });

  // Calculate summary statistics
  let totalValuation = 0;
  const tradesBreakdown: Record<string, number> = {};
  let earliestDate: string | null = null;
  let latestDate: string | null = null;

  for (const p of rawPermits) {
    if (p.valuation) {
      totalValuation += p.valuation;
    }
    tradesBreakdown[p.trade] = (tradesBreakdown[p.trade] || 0) + 1;

    if (p.issued_date) {
      if (!earliestDate || p.issued_date < earliestDate) earliestDate = p.issued_date;
      if (!latestDate || p.issued_date > latestDate) latestDate = p.issued_date;
    }
  }

  const finalPermits = rawPermits.slice(0, maxLimit);

  return {
    query: {
      address: params.address,
      permit_number: params.permit_number,
      since: sinceDate,
      trade: params.trade || "all",
    },
    summary: {
      total_permits: finalPermits.length,
      earliest_date: earliestDate,
      latest_date: latestDate,
      total_valuation: totalValuation,
      total_valuation_formatted: `$${totalValuation.toLocaleString()}`,
      trades_breakdown: tradesBreakdown,
    },
    permits: finalPermits,
    sources_queried: sourcesQueried,
  };
}
