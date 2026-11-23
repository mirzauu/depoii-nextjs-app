import sqlite3

def check_schema_and_query():
    conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(permit_contacts)")
    print("permit_contacts columns:", [c[1] for c in cur.fetchall()])
    
    cur.execute("PRAGMA table_info(pilot_requests)")
    print("pilot_requests columns:", [c[1] for c in cur.fetchall()])
    conn.close()

    conn2 = sqlite3.connect('d:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db')
    cur2 = conn2.cursor()
    cur2.execute("PRAGMA table_info(canonical_contractors)")
    print("canonical_contractors columns:", [c[1] for c in cur2.fetchall()])
    
    cur2.execute("SELECT * FROM canonical_contractors WHERE canonical_name LIKE '%New View%' OR dba LIKE '%New View%'")
    print("canonical_contractors rows:", cur2.fetchall())
    
    cur2.execute("""
        SELECT count(*), city, MIN(issued_date), MAX(issued_date), SUM(valuation)
        FROM normalized_permits
        WHERE UPPER(contractor_raw) LIKE '%NEW VIEW%' 
           OR UPPER(contractor_raw) LIKE '%NEWVIEW%'
           OR UPPER(contractor_clean) LIKE '%NEW VIEW%'
        GROUP BY city
    """)
    print("depoii_local.db normalized_permits:")
    for r in cur2.fetchall():
        print(" ", r)

    conn2.close()

check_schema_and_query()
