import sqlite3
import json

db_path = 'd:/Depoii_nextjs/data/depoii.sqlite'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. Look at all permits under New View Roofing
cur.execute("""
    SELECT address, city, parcel_ids, count(*)
    FROM permits
    WHERE UPPER(contractor_name) LIKE '%NEW VIEW%'
    GROUP BY address, city, parcel_ids
""")
rows = cur.fetchall()

total_permits = sum(r[3] for r in rows)
unique_addresses = len(set(r[0] for r in rows))
matched_parcels = set()
unmatched_addresses = []

for addr, city, p_ids, cnt in rows:
    if p_ids and p_ids != '[]':
        try:
            ids = json.loads(p_ids)
            for i in ids:
                matched_parcels.add(i)
        except:
            matched_parcels.add(p_ids)
    else:
        unmatched_addresses.append((addr, city))

print(f"Total New View Roofing permits: {total_permits}")
print(f"Total Unique Physical Addresses / Jobsites: {unique_addresses}")
print(f"Total Matched Cadastral Tax Parcels (Buildings in parcels table): {len(matched_parcels)}")
print(f"Unmatched physical addresses: {len(unmatched_addresses)}")

# Let's inspect matched parcels
cur.execute("""
    SELECT count(distinct p.account), count(distinct p.address)
    FROM parcels p
    JOIN permits pm ON pm.parcel_ids LIKE '%' || p.account || '%'
    WHERE UPPER(pm.contractor_name) LIKE '%NEW VIEW%'
""")
res = cur.fetchone()
print(f"Direct join on parcels table: Distinct Parcel Accounts = {res[0]}, Distinct Parcel Addresses = {res[1]}")

conn.close()
