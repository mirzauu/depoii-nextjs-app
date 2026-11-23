import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("""
    SELECT 
        city,
        kind,
        COUNT(*) as cnt,
        SUM(valuation) as total_val
    FROM permits
    WHERE city IN ('Dallas', 'Addison', 'Irving')
    GROUP BY city, kind
    ORDER BY city, cnt DESC
""")
rows = cur.fetchall()
print("City | Kind | Count | Total Valuation")
for r in rows:
    val_str = f"${r[3]:,.0f}" if r[3] else "$0"
    print(f"{r[0]} | {r[1]} | {r[2]} | {val_str}")

cur.execute("""
    SELECT 
        COUNT(*) as total_nv,
        SUM(CASE WHEN city IN ('Dallas', 'Addison', 'Irving') THEN 1 ELSE 0 END) as dallas_county_nv
    FROM permits
    WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'
""")
nv_tot, nv_dc = cur.fetchone()
print(f"\nNew View Roofing permits: Total={nv_tot}, in Dallas County cities={nv_dc}")

conn.close()

