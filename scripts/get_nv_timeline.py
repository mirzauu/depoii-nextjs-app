import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("""
    SELECT strftime('%Y', issued) as yr, count(*)
    FROM permits
    WHERE UPPER(contractor_name) LIKE '%NEW VIEW%'
    GROUP BY yr
    ORDER BY yr DESC
""")
print("Permits by Year:")
for r in cur.fetchall():
    print(f"  Year {r[0]}: {r[1]} permits")

print("\nRecent 2025 and 2026 Permits:")
cur.execute("""
    SELECT permit_no, city, address, issued, kind, scope
    FROM permits
    WHERE UPPER(contractor_name) LIKE '%NEW VIEW%' AND issued >= '2025-01-01'
    ORDER BY issued DESC
""")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5][:60]}")

conn.close()

