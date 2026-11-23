import sqlite3

db_path = 'd:/Depoii_nextjs/data/depoii.sqlite'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("""
    SELECT p.account, p.address, p.owner, p.city, p.sqft, count(pm.permit_no)
    FROM parcels p
    JOIN permits pm ON pm.parcel_ids LIKE '%' || p.account || '%'
    WHERE UPPER(pm.contractor_name) LIKE '%NEW VIEW%'
    GROUP BY p.account
""")
print("Matched Parcels / Buildings on file:")
for r in cur.fetchall():
    print(r)

conn.close()
