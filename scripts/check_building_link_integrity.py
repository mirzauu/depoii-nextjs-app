import sqlite3
import json

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Get all 5,805 linked permits
cur.execute("""
    SELECT permit_no, city, address, parcel_ids
    FROM permits
    WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL
""")
linked_permits = cur.fetchall()
print(f"Total linked permits: {len(linked_permits):,}")

# Check validity of parcel_ids against the parcels table
valid_building_count = 0
permits_with_valid_building = 0
unique_parcels_linked = set()
invalid_pids = 0

for pno, city, addr, pids_str in linked_permits:
    try:
        pids = json.loads(pids_str)
        if isinstance(pids, list) and len(pids) > 0:
            found = False
            for acc in pids:
                cur.execute("SELECT account, owner, sqft, year_built FROM parcels WHERE account = ?", (acc,))
                row = cur.fetchone()
                if row:
                    found = True
                    unique_parcels_linked.add(acc)
            if found:
                permits_with_valid_building += 1
            else:
                invalid_pids += 1
    except Exception as e:
        invalid_pids += 1

print(f"\nPermits with 100% verified building in 'parcels' table: {permits_with_valid_building:,}")
print(f"Unique physical buildings/parcels connected: {len(unique_parcels_linked):,}")
print(f"Permits with non-matching parcel IDs: {invalid_pids}")

# Check distribution: how many permits per building?
cur.execute("""
    SELECT p.parcel_ids, COUNT(*) as permit_count
    FROM permits p
    WHERE p.parcel_ids != '[]' AND p.parcel_ids IS NOT NULL
    GROUP BY p.parcel_ids
    ORDER BY permit_count DESC
    LIMIT 10
""")
top_buildings = cur.fetchall()
print("\nTop 10 buildings with the most permits connected:")
for pids_str, cnt in top_buildings:
    try:
        acc = json.loads(pids_str)[0]
        cur.execute("SELECT address, city, owner, sqft, year_built FROM parcels WHERE account = ?", (acc,))
        b = cur.fetchone()
        if b:
            print(f"  {acc} | {b[0]}, {b[1]} | Owner: {b[2]} | {b[3]:,} sq ft | {cnt} permits")
        else:
            print(f"  {acc} (Unmatched in parcels table) | {cnt} permits")
    except:
        pass

conn.close()

