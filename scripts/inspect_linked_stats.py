import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Get the list of all unique parcel accounts matched in the 5,805 linked permits
cur.execute("""
    SELECT DISTINCT parcel_ids 
    FROM permits 
    WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL
""")
raw_pids = cur.fetchall()

import json
all_accounts = set()
for r in raw_pids:
    try:
        p_list = json.loads(r[0])
        for a in p_list:
            all_accounts.add(a)
    except:
        pass

print(f"Total unique parcel accounts among all 5,805 linked permits: {len(all_accounts):,}")

# Check how many permits New View Roofing has in total
cur.execute("""
    SELECT COUNT(*) 
    FROM permits 
    WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'
""")
print(f"Total New View Roofing permits in permits table: {cur.fetchone()[0]}")

# Top contractors in the 5,805 linked permits
cur.execute("""
    SELECT contractor_name, COUNT(*) 
    FROM permits 
    WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL
    GROUP BY contractor_name
    ORDER BY COUNT(*) DESC
    LIMIT 10
""")
print("\nTop 10 Contractors in the 5,805 Linked Permits:")
for c, cnt in cur.fetchall():
    print(f"  {c}: {cnt:,} permits")

conn.close()

