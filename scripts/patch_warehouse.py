import re

with open('src/lib/warehouse.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update permitsParcel
old_permits_parcel = '''export async function permitsParcel(parcelId: string) {
  const rawId = parcelId;
  const strippedId = parcelId.replace(/^DCAD-PARCEL-/i, "");
  const prefixedId = parcelId.startsWith("DCAD-PARCEL-") ? parcelId : `DCAD-PARCEL-${parcelId}`;

  const parcel = await queryOne(
    `select * from warehouse.parcels
     where id = $1 or id = $2 or id = $3
        or account_number = $1 or account_number = $2 or account_number = $3
     limit 1`,
    [rawId, strippedId, prefixedId]
  );
  if (!parcel) return null;
  const permits = await query(
    `select * from warehouse.normalized_permits
     where parcel_id = $1 or parcel_id = $2 or parcel_id = $3
     order by issue_date desc nulls last`,
    [parcel.id, parcel.account_number || parcel.id, strippedId]
  );'''

new_permits_parcel = '''export async function permitsParcel(parcelId: string) {
  const rawId = parcelId;
  const strippedId = parcelId.replace(/^DCAD-PARCEL-/i, "");
  const prefixedId = parcelId.startsWith("DCAD-PARCEL-") ? parcelId : `DCAD-PARCEL-${parcelId}`;

  // 1. Direct query on warehouse.parcels
  let parcel = await queryOne<Record<string, any>>(
    `select * from warehouse.parcels
     where id = $1 or id = $2 or id = $3
        or account_number = $1 or account_number = $2 or account_number = $3
     limit 1`,
    [rawId, strippedId, prefixedId]
  );

  // 2. If not found and ID is synthetic (e.g. BLDG-<md5>), look up via permits table
  if (!parcel && rawId.startsWith("BLDG-")) {
    const md5Hash = rawId.replace(/^BLDG-/i, "");
    const permitMatch = await queryOne<Record<string, any>>(
      `select pm.parcel_id, pm.normalized_address, pm.city, pm.state, pm.zip_code, pm.latitude, pm.longitude,
              p.id as found_parcel_id
       from warehouse.normalized_permits pm
       left join warehouse.parcels p on (
         (pm.parcel_id is not null and pm.parcel_id <> '' and (p.id = pm.parcel_id or p.account_number = pm.parcel_id))
         or (lower(p.address) = lower(trim(split_part(pm.normalized_address, ',', 1))) and (p.city is null or lower(p.city) = lower(trim(pm.city))))
         or (lower(p.address) = lower(trim(pm.normalized_address)))
       )
       where md5(lower(trim(pm.normalized_address)) || '-' || lower(trim(pm.city))) = $1
       order by (p.id is not null) desc, pm.issue_date desc nulls last
       limit 1`,
      [md5Hash]
    );

    if (permitMatch?.found_parcel_id) {
      parcel = await queryOne<Record<string, any>>(
        `select * from warehouse.parcels where id = $1 limit 1`,
        [permitMatch.found_parcel_id]
      );
    } else if (permitMatch) {
      // Create a virtual parcel record from the permit data so the drawer never displays 404 / 'unable to load'
      const cleanAddress = permitMatch.normalized_address
        ? permitMatch.normalized_address.split(",")[0].trim()
        : "Building Record";
      parcel = {
        id: rawId,
        account_number: permitMatch.parcel_id || rawId,
        address: cleanAddress,
        city: permitMatch.city || "Dallas",
        state: permitMatch.state || "TX",
        county: "Dallas",
        zip_code: permitMatch.zip_code || "",
        building_sqft: 0,
        land_sqft: 0,
        year_built: 0,
        property_type: "Commercial Building",
        owner_name: "Owner on record",
        owner_address: "",
        total_valuation: 0,
        data_source: "city_permits",
        latitude: permitMatch.latitude,
        longitude: permitMatch.longitude,
        jurisdiction: permitMatch.city || "Dallas",
        year_built_source: "Permit records",
        area_source: "Permit records",
        data_provenance: "Dallas/Fort Worth Municipal Permits",
      };
    }
  }

  if (!parcel) return null;

  // Retrieve permits matching this parcel ID or address
  const permits = await query<Record<string, any>>(
    `select * from warehouse.normalized_permits
     where parcel_id = $1 or parcel_id = $2 or parcel_id = $3
        or (lower(trim(split_part(normalized_address, ',', 1))) = lower(trim($4)) and lower(trim(city)) = lower(trim($5)))
        or (lower(trim(normalized_address)) = lower(trim($4)))
     order by issue_date desc nulls last`,
    [parcel.id, parcel.account_number || parcel.id, strippedId, parcel.address || "", parcel.city || ""]
  );'''

assert old_permits_parcel in content, "old_permits_parcel not found"
content = content.replace(old_permits_parcel, new_permits_parcel, 1)

# 2. Update contractorBuildings address & join
old_cb_join = '''        from base_permits bp
        left join warehouse.parcels p on (
          (bp.parcel_id is not null and bp.parcel_id <> '' and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
          or (lower(p.address) = lower(trim(bp.normalized_address)) and lower(p.city) = lower(bp.city))
        )'''

new_cb_join = '''        from base_permits bp
        left join warehouse.parcels p on (
          (bp.parcel_id is not null and bp.parcel_id <> '' and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
          or (lower(p.address) = lower(trim(split_part(bp.normalized_address, ',', 1))) and (p.city is null or lower(p.city) = lower(trim(bp.city))))
          or (lower(p.address) = lower(trim(bp.normalized_address)) and (p.city is null or lower(p.city) = lower(trim(bp.city))))
        )'''

assert old_cb_join in content, "old_cb_join not found"
content = content.replace(old_cb_join, new_cb_join, 1)

with open('src/lib/warehouse.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("warehouse.ts successfully updated!")

