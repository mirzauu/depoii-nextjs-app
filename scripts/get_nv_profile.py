import sqlite3
import json

def get_contractor_and_contacts():
    # 1. Main DB
    conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
    cur = conn.cursor()
    cur.execute("SELECT * FROM permit_contacts WHERE UPPER(company) LIKE '%NEW VIEW%' OR UPPER(name) LIKE '%NEW VIEW%'")
    print("Main DB permit_contacts:")
    for r in cur.fetchall():
        print(" ", r)
    
    cur.execute("SELECT * FROM pilot_requests WHERE UPPER(company) LIKE '%NEW VIEW%' OR UPPER(name) LIKE '%NEW VIEW%'")
    print("Main DB pilot_requests:")
    for r in cur.fetchall():
        print(" ", r)
    conn.close()

    # 2. Data Engine
    conn2 = sqlite3.connect('d:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db')
    cur2 = conn2.cursor()
    cur2.execute("SELECT * FROM canonical_contractors WHERE UPPER(canonical_name) LIKE '%NEW VIEW%'")
    print("\nData Engine canonical_contractors:")
    cols = [d[0] for d in cur2.description]
    for r in cur2.fetchall():
        for c, v in zip(cols, r):
            if v:
                print(f"  {c}: {v}")
    
    cur2.execute("""
        SELECT count(*), city, MIN(issued_date), MAX(issued_date), SUM(valuation)
        FROM normalized_permits
        WHERE UPPER(contractor_raw) LIKE '%NEW VIEW%' 
           OR UPPER(contractor_raw) LIKE '%NEWVIEW%'
           OR UPPER(contractor_clean) LIKE '%NEW VIEW%'
        GROUP BY city
    """)
    print("\nData Engine normalized_permits:")
    for r in cur2.fetchall():
        print(" ", r)

    conn2.close()

get_contractor_and_contacts()

