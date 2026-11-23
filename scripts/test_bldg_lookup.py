import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

bldg_id = 'BLDG-6d8cfc593ddde8ffe46291d70b410a49'
md5_hash = bldg_id.replace('BLDG-', '')
cur.execute('''
  select id, raw_permit_number, normalized_address, city, state, issue_date, valuation, category, probable_roof_system, raw_description, contractor_name, latitude, longitude
  from warehouse.normalized_permits
  where md5(lower(trim(normalized_address)) || '-' || lower(trim(city))) = %s
  order by issue_date desc
''', (md5_hash,))
permits = cur.fetchall()
print(f"Found {len(permits)} permits for hash {md5_hash}:")
for p in permits:
    print(p)

