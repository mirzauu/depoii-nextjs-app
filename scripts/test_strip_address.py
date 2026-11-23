import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

cur.execute('''
  select 
    pm.id, pm.normalized_address, pm.city,
    regexp_replace(pm.normalized_address, ',.*$', '') as stripped_addr,
    p.id as parcel_id, p.address as parcel_addr, p.city as parcel_city
  from warehouse.normalized_permits pm
  left join warehouse.parcels p on (
    lower(p.address) = lower(trim(regexp_replace(pm.normalized_address, ',.*$', '')))
    and lower(p.city) = lower(trim(pm.city))
  )
  where pm.contractor_name ilike '%new view roofing%'
    and pm.normalized_address ilike '%2401%HENDERSON%'
''')
for r in cur.fetchall():
    print(r)

