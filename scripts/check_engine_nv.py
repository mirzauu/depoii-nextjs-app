import sqlite3
import json

conn = sqlite3.connect('d:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db')
cur = conn.cursor()

# 1. Check canonical_contractors for New View Roofing
cur.execute("SELECT * FROM canonical_contractors WHERE id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'")
row = cur.fetchone()
cols = [d[0] for d in cur.description]
print("canonical_contractors record:")
for c, v in zip(cols, row):
    print(f"  {c}: {v}")

# 2. Check normalized_permits for New View Roofing
cur.execute("SELECT count(*), city FROM normalized_permits WHERE contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA' OR contractor_name LIKE '%New View%' GROUP BY city")
print("\nPermits in normalized_permits:")
for r in cur.fetchall():
    print(" ", r)

conn.close()
