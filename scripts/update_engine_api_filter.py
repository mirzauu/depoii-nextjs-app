with open('d:/Depoii_nextjs/src/lib/engine-api.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx_start = text.find('export interface ContractorBuilding')
idx_end = text.find('export interface ContractorProfile')

old_code = text[idx_start:idx_end]

new_code = """export interface ContractorBuilding {
  id: string;
  parcelAccount: string;
  address: string;
  city: string;
  state: string;
  owner: string | null;
  ownerAddress: string | null;
  sqft: number;
  yearBuilt: number | null;
  propertyType: string | null;
  lat: number | null;
  lng: number | null;
  permitCount: number;
  totalValuation: number;
  latestPermitDate: string;
  workType: string;
  roofSystem: string;
  isCommercial: boolean;
  permits: string[];
}

export interface ContractorBuildingsPage {
  contractor: string;
  filter: "commercial" | "all";
  total: number;
  allCount: number;
  commercialCount: number;
  count: number;
  offset: number;
  limit: number;
  buildings: ContractorBuilding[];
}

export function mapContractorBuildings(body: unknown): ContractorBuildingsPage {
  const b = (body ?? {}) as Row;
  const rawList = Array.isArray(b.buildings) ? b.buildings : [];
  const buildings: ContractorBuilding[] = rawList.map((row): ContractorBuilding => {
    const r = (row ?? {}) as Row;
    return {
      id: str(r, ["id"]),
      parcelAccount: str(r, ["parcelAccount", "parcel_account"]),
      address: str(r, ["address"], "Address not specified"),
      city: str(r, ["city"]),
      state: str(r, ["state"], "TX"),
      owner: r.owner != null && r.owner !== "" ? String(r.owner) : null,
      ownerAddress: r.ownerAddress != null && r.ownerAddress !== "" ? String(r.ownerAddress) : null,
      sqft: num(r, ["sqft"]),
      yearBuilt: r.yearBuilt != null ? Number(r.yearBuilt) : null,
      propertyType: r.propertyType != null && r.propertyType !== "" ? String(r.propertyType) : null,
      lat: r.lat != null ? Number(r.lat) : null,
      lng: r.lng != null ? Number(r.lng) : null,
      permitCount: num(r, ["permitCount", "permit_count"]) || 1,
      totalValuation: num(r, ["totalValuation", "total_valuation"]),
      latestPermitDate: str(r, ["latestPermitDate", "latest_permit_date"]),
      workType: str(r, ["workType", "work_type"], "Roofing"),
      roofSystem: str(r, ["roofSystem", "roof_system"]),
      isCommercial: Boolean(r.isCommercial ?? r.is_commercial),
      permits: Array.isArray(r.permits) ? r.permits.map(String) : [],
    };
  });

  return {
    contractor: str(b, ["contractor"]),
    filter: (str(b, ["filter"]) as "commercial" | "all") || "commercial",
    total: num(b, ["total"]),
    allCount: num(b, ["allCount", "all_count"]),
    commercialCount: num(b, ["commercialCount", "commercial_count"]),
    count: buildings.length,
    offset: num(b, ["offset"]),
    limit: num(b, ["limit"]),
    buildings,
  };
}
\n"""

new_text = text[:idx_start] + new_code + text[idx_end:]
with open('d:/Depoii_nextjs/src/lib/engine-api.ts', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("SUCCESS: updated engine-api.ts ContractorBuildingsPage and mapContractorBuildings")
