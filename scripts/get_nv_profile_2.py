import sqlite3

def get_contractor_profile_full():
    conn2 = sqlite3.connect('d:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db')
    cur2 = conn2.cursor()
    cur2.execute("PRAGMA table_info(normalized_permits)")
    cols = [c[1] for c in cur2.fetchall()]
    print("normalized_permits columns:", cols)

    cur2.execute("""
        SELECT count(*), city, MIN(issue_date), MAX(issue_date), SUM(valuation)
        FROM normalized_permits
        WHERE UPPER(contractor_raw) LIKE '%NEW VIEW%' 
           OR UPPER(contractor_raw) LIKE '%NEWVIEW%'
           OR UPPER(contractor_clean) LIKE '%NEW VIEW%'
        GROUP BY city
    """)
    print("\nNormalized permits in data engine by city:")
    for r in cur2.fetchall():
        print(" ", r)

    conn2.close()

get_contractor_profile_full()

