import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("""
    SELECT permit_no, address, valuation, kind, contractor_name 
    FROM permits 
    WHERE (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
      AND (parcel_ids = '[]' OR parcel_ids IS NULL)
""")
rows = cur.fetchall()
print(f"Remaining unmatched commercial permits count: {len(rows)}")
for r in rows:
    print(r)

conn.close()

