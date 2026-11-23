with open('d:/Depoii_nextjs/src/lib/warehouse.ts', 'r', encoding='utf-8') as f:
    text = f.read()

contractor_buildings_func = """
export async function contractorBuildings(q: Q) {
  const target = str(q, "name") || str(q, "contractor") || str(q, "id");
  if (!target) return { total: 0, count: 0, buildings: [] };

  const cacheKey = `contractor_buildings_${target}_${q.toString()}`;
  return withCache(cacheKey, 5 * 60 * 1000, async () => {
    // 1. Resolve canonical contractor name/id
    const canonicalRow = await queryOne<Record<string, any>>(
      `select c.id, c.canonical_name
       from warehouse.canonical_contractors c
       where lower(c.canonical_name) = lower($1)
          or c.id = $1
          or lower(c.canonical_name) like lower($1) || ' %'
          or lower($1) like lower(c.canonical_name) || ' %'
       limit 1`,
      [target]
    );

    const cname = canonicalRow?.canonical_name || target;
    const cid = canonicalRow?.id || target;

    const limit = int(q, "limit", 200);
    const offset = int(q, "offset", 0);

    const sql = `
      with base_permits as (
        select pm.id as permit_id,
               pm.raw_permit_number,
               pm.parcel_id,
               pm.normalized_address,
               pm.city,
               pm.state,
               pm.issue_date,
               pm.valuation,
               pm.category,
               pm.probable_roof_system,
               pm.latitude,
               pm.longitude
        from warehouse.normalized_permits pm
        where lower(pm.contractor_name) = lower($1)
           or lower(pm.contractor_name) = lower($2)
           or pm.contractor_id = $3
      ),
      building_matches as (
        select 
          coalesce(p.id, p.account_number, bp.parcel_id, 'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city)))) as building_id,
          coalesce(p.account_number, bp.parcel_id, '') as parcel_account,
          coalesce(p.address, bp.normalized_address) as address,
          coalesce(p.city, bp.city) as city,
          coalesce(p.state, bp.state, 'TX') as state,
          p.owner_name,
          p.owner_address,
          coalesce(p.building_sqft, p.land_sqft, 0) as sqft,
          p.year_built,
          p.property_type,
          coalesce(p.latitude, bp.latitude) as latitude,
          coalesce(p.longitude, bp.longitude) as longitude,
          count(bp.permit_id) as permit_count,
          sum(coalesce(bp.valuation, 0)) as total_valuation,
          max(bp.issue_date) as latest_permit_date,
          (array_agg(bp.category order by bp.issue_date desc nulls last))[1] as primary_work_type,
          (array_agg(bp.probable_roof_system order by bp.issue_date desc nulls last))[1] as roof_system,
          array_agg(bp.raw_permit_number) as permit_numbers
        from base_permits bp
        left join warehouse.parcels p on (
          (bp.parcel_id is not null and bp.parcel_id <> '' and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
          or (lower(trim(p.address)) = lower(trim(bp.normalized_address)) and lower(p.city) = lower(bp.city))
        )
        group by 
          coalesce(p.id, p.account_number, bp.parcel_id, 'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city)))),
          coalesce(p.account_number, bp.parcel_id, ''),
          coalesce(p.address, bp.normalized_address),
          coalesce(p.city, bp.city),
          coalesce(p.state, bp.state, 'TX'),
          p.owner_name,
          p.owner_address,
          coalesce(p.building_sqft, p.land_sqft, 0),
          p.year_built,
          p.property_type,
          coalesce(p.latitude, bp.latitude),
          coalesce(p.longitude, bp.longitude)
      )
      select * from building_matches
      order by latest_permit_date desc nulls last
      limit $4 offset $5;
    `;

    const countSql = `
      select count(distinct coalesce(p.id, p.account_number, pm.parcel_id, 'BLDG-' || md5(lower(trim(pm.normalized_address)) || '-' || lower(trim(pm.city))))) as total
      from warehouse.normalized_permits pm
      left join warehouse.parcels p on (
        (pm.parcel_id is not null and pm.parcel_id <> '' and (p.id = pm.parcel_id or p.account_number = pm.parcel_id))
        or (lower(trim(p.address)) = lower(trim(pm.normalized_address)) and lower(p.city) = lower(pm.city))
      )
      where lower(pm.contractor_name) = lower($1)
         or lower(pm.contractor_name) = lower($2)
         or pm.contractor_id = $3;
    `;

    const [rows, countRow] = await Promise.all([
      query<Record<string, any>>(sql, [cname, target, cid, limit, offset]),
      queryOne<{ total: string }>(countSql, [cname, target, cid])
    ]);

    const total = Number(countRow?.total || 0);

    const buildings = rows.map((r) => ({
      id: String(r.building_id || ""),
      parcelAccount: String(r.parcel_account || ""),
      address: String(r.address || "Address not specified"),
      city: String(r.city || ""),
      state: String(r.state || "TX"),
      owner: r.owner_name ? String(r.owner_name) : null,
      ownerAddress: r.owner_address ? String(r.owner_address) : null,
      sqft: Number(r.sqft || 0),
      yearBuilt: r.year_built ? Number(r.year_built) : null,
      propertyType: r.property_type ? String(r.property_type) : null,
      lat: r.latitude != null ? Number(r.latitude) : null,
      lng: r.longitude != null ? Number(r.longitude) : null,
      permitCount: Number(r.permit_count || 1),
      totalValuation: Number(r.total_valuation || 0),
      latestPermitDate: r.latest_permit_date ? String(r.latest_permit_date).slice(0, 10) : "",
      workType: String(r.primary_work_type || "Roofing"),
      roofSystem: String(r.roof_system || ""),
      permits: Array.isArray(r.permit_numbers) ? r.permit_numbers.map(String) : []
    }));

    return {
      contractor: cname,
      total,
      count: buildings.length,
      offset,
      limit,
      buildings
    };
  });
}
"""

marker = "export async function locations(kind: \"hierarchy\" | \"states\" | \"cities\") {"
if marker in text:
    new_text = text.replace(marker, contractor_buildings_func + "\n" + marker, 1)
    with open('d:/Depoii_nextjs/src/lib/warehouse.ts', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("SUCCESS: added contractorBuildings to warehouse.ts")
else:
    print("MARKER NOT FOUND in warehouse.ts")

