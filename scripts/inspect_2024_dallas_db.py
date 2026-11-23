import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()
cur.execute("""
    SELECT kind, COUNT(*), SUM(valuation) 
    FROM permits 
    WHERE city = 'Dallas' AND SUBSTR(issued, 1, 4) = '2024' 
    GROUP BY kind
""")
print("2024 Dallas permits currently in depoii.sqlite:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} permits (${r[2]:,.0f})")

cur.execute("""
    SELECT permit_no, address, contractor_name, valuation, scope
    FROM permits 
    WHERE city = 'Dallas' AND SUBSTR(issued, 1, 4) = '2024' 
    LIMIT 3
""")
print("\nSample rows:")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2]} | ${r[3]:,.0f} | {r[4][:60]}")

conn.close()

