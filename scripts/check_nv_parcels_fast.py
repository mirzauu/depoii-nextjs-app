import sqlite3
import json

db_path = 'd:/Depoii_nextjs/data/depoii.sqlite'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get all unique parcel accounts attached to New View permits
cur.execute("""
    SELECT DISTINCT parcel_ids
    FROM permits
    WHERE UPPER(contractor_name) LIKE '%NEW VIEW%'
      AND parcel_ids != '[]' 
      AND parcel_ids IS NOT NULL
""")
accts = set()
for r in cur.fetchall():
    try:
        p_list = json.loads(r[0])
        for p in p_list:
            accts.add(p)
    except:
        accts.add(r[0])

print(f"Distinct parcel accounts referenced: {len(accts)}")
for a in accts:
    cur.execute("SELECT account, address, owner, city, sqft FROM parcels WHERE account = ?", (a,))
    p_info = cur.fetchone()
    print(" ", a, "->", p_info)

conn.close()
