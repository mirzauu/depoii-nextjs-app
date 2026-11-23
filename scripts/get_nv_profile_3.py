import sqlite3

def get_stats():
    # 1. Main DB permits
    conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            city,
            COUNT(*) as permit_count,
            MIN(issued) as earliest,
            MAX(issued) as latest,
            SUM(valuation) as total_val,
            COUNT(DISTINCT address) as unique_jobsites
        FROM permits
        WHERE UPPER(contractor_name) LIKE '%NEW VIEW%'
        GROUP BY city
        ORDER BY permit_count DESC
    """)
    print("Main DB (depoii.sqlite) Permits by City:")
    for r in cur.fetchall():
        print(f"  City: {r[0]:12} | Permits: {r[1]:4} | Earliest: {r[2]} | Latest: {r[3]} | Total Val: ${r[4]:,} | Sites: {r[5]}")

    cur.execute("""
        SELECT kind, COUNT(*) 
        FROM permits 
        WHERE UPPER(contractor_name) LIKE '%NEW VIEW%' 
        GROUP BY kind
    """)
    print("\nPermit Types Breakdown:")
    for r in cur.fetchall():
        print(f"  {r[0]}: {r[1]}")

    conn.close()

    # 2. Data Engine
    conn2 = sqlite3.connect('d:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db')
    cur2 = conn2.cursor()
    cur2.execute("""
        SELECT 
            city,
            COUNT(*) as permit_count,
            MIN(issue_date) as earliest,
            MAX(issue_date) as latest,
            SUM(valuation) as total_val
        FROM normalized_permits
        WHERE UPPER(contractor_name) LIKE '%NEW VIEW%' OR contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'
        GROUP BY city
        ORDER BY permit_count DESC
    """)
    print("\nData Engine (depoii_local.db) Permits by City:")
    for r in cur2.fetchall():
        print(f"  City: {r[0]:12} | Permits: {r[1]:4} | Earliest: {r[2]} | Latest: {r[3]} | Val: ${r[4]:,}" if r[4] else f"  City: {r[0]:12} | Permits: {r[1]:4} | Earliest: {r[2]} | Latest: {r[3]} | Val: $0")
    conn2.close()

get_stats()

