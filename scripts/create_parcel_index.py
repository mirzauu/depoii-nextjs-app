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

print("Creating index idx_parcels_lower_trim_addr...")
t0 = time.time()
cur.execute("CREATE INDEX IF NOT EXISTS idx_parcels_lower_trim_addr ON warehouse.parcels (lower(trim(address)));")
conn.commit()
print(f"Index created in {time.time() - t0:.2f}s")

