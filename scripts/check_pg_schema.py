import psycopg2
import json

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='warehouse' AND table_name='canonical_contractors'")
print("canonical_contractors columns:")
for r in cur.fetchall():
    print(" ", r)

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='warehouse' AND table_name='normalized_permits'")
print("\nnormalized_permits columns:")
for r in cur.fetchall():
    print(" ", r)

conn.close()
