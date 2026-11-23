import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Query how many permits linked to parcels are under New View Roofing / MOB Home Solutions
cur.execute("""
    SELECT COUNT(*) 
    FROM permits 
    WHERE (contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%')
      AND parcel_ids != '[]' 
      AND parcel_ids IS NOT NULL
""")
nv_linked_count = cur.fetchone()[0]

# Total New View permits
cur.execute("""
    SELECT COUNT(*) 
    FROM permits 
    WHERE (contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%')
""")
nv_total = cur.fetchone()[0]

# List the linked permits for New View Roofing
cur.execute("""
    SELECT permit_no, city, address, kind, issued, valuation, scope, parcel_ids
    FROM permits 
    WHERE (contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%')
      AND parcel_ids != '[]' 
      AND parcel_ids IS NOT NULL
    ORDER BY issued DESC
""")
rows = cur.fetchall()

print(f"Total New View Roofing permits in DB: {nv_total}")
print(f"New View Roofing permits linked to parcels: {nv_linked_count}")
print("\nDetailed list of New View Roofing linked permits:")
for r in rows:
    pno, city, addr, kind, issued, val, scope, pids = r
    val_str = f"${val:,.0f}" if val else "$0"
    print(f"  {pno} | {city} | {addr} | {kind} | {issued} | {val_str} | Parcels: {pids}")

conn.close()
