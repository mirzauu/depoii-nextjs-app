import psycopg2
import time

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

target = 'New View Roofing'
t0 = time.time()
cur.execute('''
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
           pm.longitude,
           lower(trim(regexp_replace(pm.normalized_address, ',.*$', ''))) as clean_addr
    from warehouse.normalized_permits pm
    where lower(pm.contractor_name) = lower(%s)
  ),
  building_matches as (
    select 
      coalesce(p.id, p.account_number, bp.parcel_id, 'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city)))) as building_id,
      coalesce(p.account_number, bp.parcel_id, '') as parcel_account,
      coalesce(p.address, bp.normalized_address) as address,
      coalesce(p.city, bp.city) as city,
      p.owner_name,
      count(bp.permit_id) as permit_count
    from base_permits bp
    left join warehouse.parcels p on (
      (bp.parcel_id is not null and bp.parcel_id <> '' and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
      or (lower(p.address) = bp.clean_addr and lower(p.city) = lower(trim(bp.city)))
    )
    group by 
      coalesce(p.id, p.account_number, bp.parcel_id, 'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city)))),
      coalesce(p.account_number, bp.parcel_id, ''),
      coalesce(p.address, bp.normalized_address),
      coalesce(p.city, bp.city),
      p.owner_name
  )
  select * from building_matches
  order by permit_count desc
  limit 10
''', (target,))
rows = cur.fetchall()
elapsed = time.time() - t0
print(f"Query executed in {elapsed*1000:.1f}ms! Rows returned: {len(rows)}")
for r in rows:
    print(r)

