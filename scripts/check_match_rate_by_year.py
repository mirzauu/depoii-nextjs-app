import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("""
    SELECT 
        SUBSTR(issued, 1, 4) as yr,
        COUNT(*) as total_yr,
        SUM(CASE WHEN parcel_ids != '[]' AND parcel_ids IS NOT NULL THEN 1 ELSE 0 END) as linked_yr
    FROM permits
    WHERE city = 'Dallas' AND SUBSTR(issued, 1, 4) BETWEEN '2018' AND '2026'
    GROUP BY yr
    ORDER BY yr DESC
""")
rows = cur.fetchall()
print("Year | Total Dallas | Matched to Buildings | Match Rate")
for yr, tot, lk in rows:
    pct = (lk / tot * 100) if tot > 0 else 0
    print(f"{yr} | {tot:,} | {lk:,} | {pct:.1f}%")

conn.close()

