import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db')
cur = conn.cursor()

cur.execute("""
    SELECT 
        SUBSTR(issue_date, 1, 4) as yr,
        COUNT(*) as cnt
    FROM normalized_permits
    WHERE city = 'Dallas' AND issue_date IS NOT NULL AND issue_date != ''
      AND SUBSTR(issue_date, 1, 4) BETWEEN '2010' AND '2026'
    GROUP BY yr
    ORDER BY yr ASC
""")
rows = cur.fetchall()
print("City of Dallas total permits by year in normalized_permits (depoii_local.db):")
for yr, cnt in rows:
    print(f"  {yr}: {cnt:,} permits")

conn.close()

