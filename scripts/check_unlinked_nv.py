import sqlite3
import re

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Get all unlinked New View permits in Dallas
cur.execute("""
    SELECT permit_no, address 
    FROM permits 
    WHERE (contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%')
      AND city = 'Dallas'
      AND (parcel_ids = '[]' OR parcel_ids IS NULL)
""")
unlinked = cur.fetchall()
print(f"Unlinked Dallas New View permits: {len(unlinked)}")

# Check against parcels
sample_matches = 0
for pno, addr in unlinked:
    # clean street
    s = addr.split(',')[0].strip().upper()
    # check exact or like in parcels
    cur.execute("SELECT account, address FROM parcels WHERE city = 'Dallas' AND UPPER(address) = ?", (s,))
    m = cur.fetchone()
    if m:
        sample_matches += 1
        # print first few
        if sample_matches <= 5:
            print(f"  Matchable: {pno} | '{addr}' -> Parcel: {m[0]} ({m[1]})")

print(f"Total newly matchable unlinked permits: {sample_matches}")
conn.close()
