import sqlite3
import json

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Total permits
cur.execute("SELECT COUNT(*) FROM permits")
total_permits = cur.fetchone()[0]

# Permits with non-empty parcel_ids
cur.execute("SELECT COUNT(*) FROM permits WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL")
linked_permits_count = cur.fetchone()[0]

# Check how many of these linked permits point to an existing record in the parcels table
cur.execute("SELECT permit_no, parcel_ids, city FROM permits WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL")
linked_rows = cur.fetchall()

verified_permits = 0
unique_buildings = set()
unmatched_pids = 0

for pno, pids_str, city in linked_rows:
    try:
        pids = json.loads(pids_str)
        if isinstance(pids, list) and len(pids) > 0:
            found = False
            for acc in pids:
                cur.execute("SELECT account FROM parcels WHERE account = ?", (acc,))
                if cur.fetchone():
                    found = True
                    unique_buildings.add(acc)
            if found:
                verified_permits += 1
            else:
                unmatched_pids += 1
    except:
        unmatched_pids += 1

print(f"Total permits in database: {total_permits:,}")
print(f"Permits with parcel_ids assigned: {linked_permits_count:,}")
print(f"Permits 100% matched to physical buildings in parcels table: {verified_permits:,}")
print(f"Unique physical buildings/parcels matched: {len(unique_buildings):,}")
print(f"Permits with historical/unindexed parcel IDs: {unmatched_pids:,}")

# Breakdown of matched permits by city
cur.execute("""
    SELECT city, COUNT(*)
    FROM permits
    WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL
    GROUP BY city
    ORDER BY COUNT(*) DESC
""")
print("\nMatched permits by city:")
for c, cnt in cur.fetchall():
    print(f"  {c}: {cnt:,} permits")

# Breakdown by kind
cur.execute("""
    SELECT kind, COUNT(*)
    FROM permits
    WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL
    GROUP BY kind
    ORDER BY COUNT(*) DESC
""")
print("\nMatched permits by kind:")
for k, cnt in cur.fetchall():
    print(f"  {k}: {cnt:,} permits")

conn.close()

