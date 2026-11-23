import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

target = 'New View Roofing'
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
           pm.longitude
    from warehouse.normalized_permits pm
    where lower(pm.contractor_name) = lower(%s)
  )
  select 
    bp.normalized_address,
    bp.city,
    bp.parcel_id,
    p.id as parcel_table_id,
    p.account_number as parcel_account,
    'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city))) as synthetic_id
  from base_permits bp
  left join warehouse.parcels p on (
    (bp.parcel_id is not null and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
    or (lower(p.address) = lower(trim(bp.normalized_address)) and (p.city is null or lower(p.city) = lower(trim(bp.city))))
  )
  where 'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city))) = 'BLDG-6d8cfc593ddde8ffe46291d70b410a49'
     or p.id = 'BLDG-6d8cfc593ddde8ffe46291d70b410a49'
     or bp.parcel_id = 'BLDG-6d8cfc593ddde8ffe46291d70b410a49'
  limit 5
''', (target,))
rows = cur.fetchall()
print("Matches for BLDG-6d8cfc593ddde8ffe46291d70b410a49:")
for r in rows:
    print(r)

