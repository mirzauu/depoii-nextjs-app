import sqlite3
import json

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("Tables in depoii.sqlite:", tables)

for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    cnt = cur.fetchone()[0]
    print(f"  {t}: {cnt} rows")

cur.execute("PRAGMA table_info(parcels)")
print("Parcels cols:", [r[1] for r in cur.fetchall()])

# Check permit kinds for New View Roofing
cur.execute("""
    SELECT kind, COUNT(*) 
    FROM permits 
    WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%' 
    GROUP BY kind
""")
print("\nPermits by kind for New View Roofing:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

# Check by city as well
cur.execute("""
    SELECT city, kind, COUNT(*) 
    FROM permits 
    WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%' 
    GROUP BY city, kind
""")
print("\nPermits by city and kind for New View Roofing:")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]}: {r[2]}")

conn.close()

