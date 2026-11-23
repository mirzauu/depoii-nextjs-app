import os
import psycopg2
from urllib.parse import urlparse

# Read DATABASE_URL from .env
db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

if not db_url:
    print("No DATABASE_URL found in .env")
    exit(1)

print("Connecting to Postgres...")
try:
    conn = psycopg2.connect(db_url, sslmode='require')
    cur = conn.cursor()
    cur.execute("SELECT current_database(), current_schema()")
    print("Connected to:", cur.fetchone())

    # Check for canonical_contractors table
    cur.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%contractor%'")
    print("Contractor tables in Postgres:")
    for r in cur.fetchall():
        print(" ", r)

    cur.execute("SELECT id, canonical_name, headquarters_city, total_permits, total_valuation FROM warehouse.canonical_contractors WHERE canonical_name ILIKE '%New View%' OR canonical_name ILIKE '%Mob Home%'")
    print("\nCanonical contractors matching New View:")
    rows = cur.fetchall()
    for r in rows:
        print(" ", r)

    cur.execute("SELECT count(*), city FROM warehouse.normalized_permits WHERE contractor_name ILIKE '%New View%' OR contractor_id LIKE '%NEW-VIEW%' OR contractor_id LIKE '%MOB-HOME%' GROUP BY city")
    print("\nPermits in warehouse.normalized_permits:")
    for r in cur.fetchall():
        print(" ", r)

    conn.close()
except Exception as e:
    print("Postgres query error:", e)
