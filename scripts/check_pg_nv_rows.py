import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()
cur.execute("SELECT id, canonical_name, headquarters_city FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%New View%'")
for r in cur.fetchall():
    print(r)
conn.close()
