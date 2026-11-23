import asyncio
import os
import sys

# Test the permitsParcel function via node or python to verify it resolves BLDG-6d8cfc593ddde8ffe46291d70b410a49
import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

raw_id = 'BLDG-6d8cfc593ddde8ffe46291d70b410a49'
md5_hash = raw_id.replace('BLDG-', '')

cur.execute('''
  select pm.parcel_id, pm.normalized_address, pm.city, pm.state, pm.zip_code, pm.latitude, pm.longitude,
         p.id as found_parcel_id
  from warehouse.normalized_permits pm
  left join warehouse.parcels p on (
    (pm.parcel_id is not null and pm.parcel_id <> '' and (p.id = pm.parcel_id or p.account_number = pm.parcel_id))
    or (lower(p.address) = lower(trim(split_part(pm.normalized_address, ',', 1))) and (p.city is null or lower(p.city) = lower(trim(pm.city))))
    or (lower(p.address) = lower(trim(pm.normalized_address)))
  )
  where md5(lower(trim(pm.normalized_address)) || '-' || lower(trim(pm.city))) = %s
  order by (p.id is not null) desc, pm.issue_date desc nulls last
  limit 1
''', (md5_hash,))
row = cur.fetchone()
print("permitMatch result:", row)

if row and row[-1]:
    cur.execute('select id, address, city, owner_name, property_type, building_sqft from warehouse.parcels where id = %s', (row[-1],))
    parcel = cur.fetchone()
    print("Found parcel:", parcel)

