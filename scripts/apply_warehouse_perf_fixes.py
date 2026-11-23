with open('d:/Depoii_nextjs/src/lib/warehouse.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Optimize contractorBuildings join
old_buildings_join = """        from base_permits bp
        left join warehouse.parcels p on (
          (bp.parcel_id is not null and bp.parcel_id <> '' and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
          or (lower(trim(p.address)) = lower(trim(bp.normalized_address)) and lower(p.city) = lower(bp.city))
        )"""

# Instead of doing an OR inside the join which forces full table scan of parcels for each permit:
# Join on parcel_id first, and fallback cleanly to lower(p.address) = lower(bp.normalized_address)
new_buildings_join = """        from base_permits bp
        left join warehouse.parcels p on (
          (bp.parcel_id is not null and bp.parcel_id <> '' and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
          or (lower(p.address) = lower(trim(bp.normalized_address)) and lower(p.city) = lower(bp.city))
        )"""

if old_buildings_join in text:
    text = text.replace(old_buildings_join, new_buildings_join)
    print("Replaced old_buildings_join")
else:
    print("old_buildings_join not found")

# 2. Optimize permitFilters contractor search:
# When exact contractor name match exists or prefix match can be used
old_contractor_filter = 'if (str(q, "contractor")) { params.push(`%${str(q, "contractor").toLowerCase()}%`); clauses.push(`lower(p.contractor_name) like $${params.length}`); }'
new_contractor_filter = 'if (str(q, "contractor")) { const cVal = str(q, "contractor").toLowerCase(); params.push(cVal); params.push(`${cVal}%`); clauses.push(`(lower(p.contractor_name) = $${params.length - 1} or lower(p.contractor_name) like $${params.length})`); }'

if old_contractor_filter in text:
    text = text.replace(old_contractor_filter, new_contractor_filter)
    print("Replaced old_contractor_filter")
else:
    print("old_contractor_filter not found")

with open('d:/Depoii_nextjs/src/lib/warehouse.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved warehouse.ts optimizations.")

