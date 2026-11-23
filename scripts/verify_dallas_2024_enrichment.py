import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

print("--- City of Dallas 2024 Breakdown by Kind ---")
cur.execute("""
    SELECT kind, COUNT(*), SUM(valuation)
    FROM permits
    WHERE city = 'Dallas' AND SUBSTR(issued, 1, 4) = '2024'
    GROUP BY kind
    ORDER BY COUNT(*) DESC
""")
for r in cur.fetchall():
    val_str = f"${r[2]:,.0f}" if r[2] else "$0"
    print(f"  {r[0]}: {r[1]:,} permits | Total Val: {val_str}")

print("\n--- Top 15 Roofing Contractors in City of Dallas (2024) ---")
cur.execute("""
    SELECT contractor_name, COUNT(*), SUM(valuation)
    FROM permits
    WHERE city = 'Dallas' AND SUBSTR(issued, 1, 4) = '2024'
      AND contractor_name != 'Owner / Self-Contractor'
    GROUP BY contractor_name
    ORDER BY COUNT(*) DESC
    LIMIT 15
""")
for r in cur.fetchall():
    val_str = f"${r[2]:,.0f}" if r[2] else "$0"
    print(f"  {r[0]}: {r[1]:,} permits ({val_str})")

print("\n--- Roofing Systems / Membranes in 2024 Dallas ---")
cur.execute("""
    SELECT membrane, COUNT(*)
    FROM permits
    WHERE city = 'Dallas' AND SUBSTR(issued, 1, 4) = '2024'
    GROUP BY membrane
    ORDER BY COUNT(*) DESC
""")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]:,} permits")

conn.close()

