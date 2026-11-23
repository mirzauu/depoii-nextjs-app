import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Query for City of Dallas permits
cur.execute("""
    SELECT 
        MIN(issued), 
        MAX(issued),
        COUNT(*),
        COUNT(issued)
    FROM permits 
    WHERE city = 'Dallas'
""")
min_d, max_d, total_cnt, issued_cnt = cur.fetchone()
print(f"City of Dallas permits in depoii.sqlite:")
print(f"  Total permits: {total_cnt}")
print(f"  With issued date: {issued_cnt}")
print(f"  Earliest Date: {min_d}")
print(f"  Latest Date: {max_d}")

# Year-by-year distribution in depoii.sqlite
cur.execute("""
    SELECT 
        SUBSTR(issued, 1, 4) as yr,
        COUNT(*) as cnt,
        SUM(valuation) as val
    FROM permits
    WHERE city = 'Dallas'
    GROUP BY yr
    ORDER BY yr ASC
""")
rows = cur.fetchall()
print("\nYear-by-year in depoii.sqlite:")
for yr, cnt, val in rows:
    val_str = f"${val:,.0f}" if val else "$0"
    print(f"  {yr}: {cnt} permits | Total Val: {val_str}")

# Check New View Roofing specifically in City of Dallas
cur.execute("""
    SELECT 
        MIN(issued), 
        MAX(issued),
        COUNT(*)
    FROM permits 
    WHERE city = 'Dallas' AND (contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%')
""")
nv_min, nv_max, nv_cnt = cur.fetchone()
print(f"\nNew View Roofing in City of Dallas:")
print(f"  Permits: {nv_cnt}")
print(f"  Range: {nv_min} to {nv_max}")

# Also check Data Engine (Roofx/depoii-data-engine/depoii_local.db) for City of Dallas
conn_de = sqlite3.connect('d:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db')
cur_de = conn_de.cursor()

cur_de.execute("""
    SELECT 
        MIN(issue_date), 
        MAX(issue_date),
        COUNT(*)
    FROM normalized_permits 
    WHERE city = 'Dallas' AND issue_date IS NOT NULL AND issue_date != ''
""")
de_min, de_max, de_cnt = cur_de.fetchone()
print(f"\nData Engine (depoii_local.db) - City of Dallas:")
print(f"  Total permits with dates: {de_cnt}")
print(f"  Earliest Date: {de_min}")
print(f"  Latest Date: {de_max}")

conn.close()
conn_de.close()

