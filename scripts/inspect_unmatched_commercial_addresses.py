import sqlite3
import re

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("""
    SELECT permit_no, address, valuation, scope
    FROM permits
    WHERE (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
      AND (parcel_ids = '[]' OR parcel_ids IS NULL)
""")
rows = cur.fetchall()
print(f"Total unmatched commercial permits: {len(rows)}")

# Let's inspect address variations
addresses = [r[1] for r in rows]
print("\nSample 15 unmatched addresses:")
for a in addresses[:15]:
    print(f"  {a}")

# Let's test address normalization and see if any fuzzy/partial matches exist in parcels
# Check how many distinct street names exist
streets = set()
for a in addresses:
    clean = a.split(',')[0].strip()
    m = re.match(r'^\d+\s+(.*)', clean)
    if m:
        streets.add(m.group(1).upper())

print(f"\nUnique street names among unmatched: {len(streets)}")

# Check if these street names exist in parcels table
found_streets = 0
for st in list(streets)[:20]:
    cur.execute("SELECT COUNT(*) FROM parcels WHERE UPPER(address) LIKE ?", (f"%{st}%",))
    cnt = cur.fetchone()[0]
    if cnt > 0:
        found_streets += 1
    print(f"  Street '{st}': {cnt} parcels in table")

conn.close()

