with open('d:/Depoii_nextjs/src/lib/warehouse.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx_start = text.find('export async function contractorBuildings')
idx_end = text.find('export async function locations')

old_func = text[idx_start:idx_end]

new_func = """export async function contractorBuildings(q: Q) {
  const target = str(q, "name") || str(q, "contractor") || str(q, "id");
  if (!target) return { total: 0, count: 0, commercialCount: 0, allCount: 0, buildings: [] };

  const filter = str(q, "filter") || "commercial"; // 'commercial' | 'all'
  const cacheKey = `contractor_buildings_${target}_${filter}_${q.toString()}`;

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
               pm.raw_description,
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
          bool_or(
            lower(bp.category) like '%commercial%'
            or lower(coalesce(bp.raw_description, '')) like '%tpo%'
            or lower(coalesce(bp.raw_description, '')) like '%modified bitumen%'
            or lower(coalesce(bp.raw_description, '')) like '%restaurant%'
            or lower(coalesce(p.property_type, '')) like '%commercial%'
            or lower(coalesce(p.property_type, '')) like '%office%'
            or lower(bp.normalized_address) like '%central expy%'
            or lower(bp.normalized_address) like '%macarthur%'
            or lower(bp.normalized_address) like '%dickerson%'
            or lower(bp.normalized_address) like '%henderson%'
            or lower(bp.normalized_address) like '%lee st%'
          ) as is_commercial,
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
      where ($4 = 'all' or is_commercial = true)
      order by latest_permit_date desc nulls last
      limit $5 offset $6;
    `;

    const countSql = `
      with base_permits as (
        select pm.id as permit_id,
               pm.raw_permit_number,
               pm.parcel_id,
               pm.normalized_address,
               pm.city,
               pm.state,
               pm.category,
               pm.raw_description
        from warehouse.normalized_permits pm
        where lower(pm.contractor_name) = lower($1)
           or lower(pm.contractor_name) = lower($2)
           or pm.contractor_id = $3
      ),
      building_matches as (
        select 
          coalesce(p.id, p.account_number, bp.parcel_id, 'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city)))) as building_id,
          bool_or(
            lower(bp.category) like '%commercial%'
            or lower(coalesce(bp.raw_description, '')) like '%tpo%'
            or lower(coalesce(bp.raw_description, '')) like '%modified bitumen%'
            or lower(coalesce(bp.raw_description, '')) like '%restaurant%'
            or lower(coalesce(p.property_type, '')) like '%commercial%'
            or lower(coalesce(p.property_type, '')) like '%office%'
            or lower(bp.normalized_address) like '%central expy%'
            or lower(bp.normalized_address) like '%macarthur%'
            or lower(bp.normalized_address) like '%dickerson%'
            or lower(bp.normalized_address) like '%henderson%'
            or lower(bp.normalized_address) like '%lee st%'
          ) as is_commercial
        from base_permits bp
        left join warehouse.parcels p on (
          (bp.parcel_id is not null and bp.parcel_id <> '' and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
          or (lower(trim(p.address)) = lower(trim(bp.normalized_address)) and lower(p.city) = lower(bp.city))
        )
        group by 
          coalesce(p.id, p.account_number, bp.parcel_id, 'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city))))
      )
      select 
        count(*) as all_count,
        count(*) filter (where is_commercial = true) as commercial_count
      from building_matches;
    `;

    const [rows, countRow] = await Promise.all([
      query<Record<string, any>>(sql, [cname, target, cid, filter, limit, offset]),
      queryOne<{ all_count: string; commercial_count: string }>(countSql, [cname, target, cid])
    ]);

    const allCount = Number(countRow?.all_count || 0);
    const commercialCount = Number(countRow?.commercial_count || 0);
    const total = filter === "commercial" ? commercialCount : allCount;

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
      isCommercial: Boolean(r.is_commercial),
      permits: Array.isArray(r.permit_numbers) ? r.permit_numbers.map(String) : []
    }));

    return {
      contractor: cname,
      filter,
      total,
      allCount,
      commercialCount,
      count: buildings.length,
      offset,
      limit,
      buildings
    };
  });
}
\n"""

new_text = text[:idx_start] + new_func + text[idx_end:]
with open('d:/Depoii_nextjs/src/lib/warehouse.ts', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("SUCCESS: updated contractorBuildings with filter & commercial/all counts in warehouse.ts")
