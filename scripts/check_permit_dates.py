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
  select date_quality, count(*), min(issue_date), max(issue_date)
  from warehouse.normalized_permits
  where contractor_name ilike '%new view roofing%'
  group by 1
''')
print("date_quality distribution:")
for r in cur.fetchall():
    print(r)

cur.execute('''
  select id, raw_permit_number, issue_date, date_quality, applied_date
  from warehouse.normalized_permits
  where contractor_name ilike '%new view roofing%'
  order by issue_date desc nulls last
  limit 5
''')
print("\nSample permits:")
for r in cur.fetchall():
    print(r)
