import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

# Try matching split_part
cur.execute('''
  select 
    pm.id, pm.normalized_address,
    split_part(pm.normalized_address, ',', 1) as street_only,
    p.id as parcel_id, p.address as parcel_address
  from warehouse.normalized_permits pm
  left join warehouse.parcels p on (
    lower(p.address) = lower(trim(split_part(pm.normalized_address, ',', 1)))
    and lower(p.city) = lower(trim(pm.city))
  )
  where pm.id = 'DAL-ACA-COM-ROOF-25-000170'
''')
row = cur.fetchone()
print("Matched row with split_part:", row)

