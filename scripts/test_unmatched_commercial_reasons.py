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
unmatched = cur.fetchall()

print(f"Total unmatched commercial permits: {len(unmatched)}")

sample_tests = [
    "6300 HARRY HINES BLVD",
    "12500 TI BLVD",
    "4501 CLEVELAND RD",
    "3501 ASH LN",
    "3430 DUNCANVILLE RD"
]

print("\nAddress test against parcels table:")
for s in sample_tests:
    cur.execute("SELECT account, address, owner FROM parcels WHERE UPPER(address) LIKE ?", (f"%{s}%",))
    m = cur.fetchall()
    print(f"Search '{s}': {len(m)} matches in parcels table")
    for r in m[:2]:
        print(f"  -> {r[0]} | {r[1]} | {r[2]}")

conn.close()

