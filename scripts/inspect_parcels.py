import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("SELECT city, COUNT(*) FROM parcels GROUP BY city ORDER BY COUNT(*) DESC LIMIT 20")
print("Top 20 cities in parcels table:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

cur.execute("SELECT * FROM parcels LIMIT 5")
print("\nSample 5 parcels:")
for r in cur.fetchall():
    print(f"  Account: {r[0]} | Owner: {r[1]} | Address: {r[2]} | City: {r[3]} | Sqft: {r[5]}")

conn.close()

