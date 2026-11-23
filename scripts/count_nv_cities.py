import sqlite3

db_path = 'd:/Depoii_nextjs/data/depoii.sqlite'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("""
    SELECT city, count(*), count(distinct address)
    FROM permits
    WHERE UPPER(contractor_name) LIKE '%NEW VIEW%'
    GROUP BY city
""")
print("New View permits and unique physical building addresses by city:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} permits across {r[2]} distinct building addresses")

conn.close()
