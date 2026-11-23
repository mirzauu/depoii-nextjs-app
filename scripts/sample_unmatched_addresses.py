import sqlite3
import re

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("""
    SELECT address, valuation, kind, city
    FROM permits
    WHERE (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
      AND (parcel_ids = '[]' OR parcel_ids IS NULL)
    LIMIT 25
""")

rows = cur.fetchall()
print(f"Sample unmatched addresses:")
for r in rows:
    print(r)

conn.close()

