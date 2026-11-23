import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("""
    SELECT SUBSTR(issued, 1, 4) as yr, COUNT(*) 
    FROM permits 
    WHERE (contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%') AND city = 'Dallas' 
    GROUP BY yr 
    ORDER BY yr DESC
""")
print("Dallas New View permits by year:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} permits")

cur.execute("""
    SELECT COUNT(*) 
    FROM permits 
    WHERE (contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%')
      AND parcel_ids != '[]' AND parcel_ids IS NOT NULL
""")
print(f"\nNew View linked to parcels: {cur.fetchone()[0]}")

conn.close()

