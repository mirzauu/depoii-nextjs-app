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
  select pm.normalized_address, pm.city,
         p.id, p.account_number, p.address, p.owner_name
  from warehouse.normalized_permits pm
  left join warehouse.parcels p on (
    (lower(p.address) = lower(trim(split_part(pm.normalized_address, ',', 1))) and (p.city is null or lower(p.city) = lower(trim(pm.city))))
    or (lower(p.address) = lower(trim(pm.normalized_address)))
  )
  where md5(lower(trim(pm.normalized_address)) || '-' || lower(trim(pm.city))) = '6d8cfc593ddde8ffe46291d70b410a49'
''')
print('Found:', cur.fetchall())

