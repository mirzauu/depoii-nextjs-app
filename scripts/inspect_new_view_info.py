import sqlite3
import json

db_path = r'd:/Depoii_nextjs/data/depoii.sqlite'
engine_path = r'd:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db'

def inspect_db(path, name):
    print(f"=== INSPECTING {name} ({path}) ===")
    try:
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        
        # Check tables
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [t[0] for t in cur.fetchall()]
        print(f"Tables: {tables}")
        
        # In permits table
        if 'permits' in tables:
            cur.execute("""
                SELECT count(*), contractor_name, city
                FROM permits 
                WHERE UPPER(contractor_name) LIKE '%NEW VIEW%' 
                   OR UPPER(contractor_name) LIKE '%NEWVIEW%'
                   OR UPPER(scope) LIKE '%NEW VIEW%'
                GROUP BY contractor_name, city
            """)
            print("\nPermits matching 'NEW VIEW':")
            for r in cur.fetchall():
                print(" ", r)
                
            cur.execute("""
                SELECT count(*), MIN(issued), MAX(issued), SUM(valuation), 
                       SUM(CASE WHEN parcel_ids != '[]' AND parcel_ids IS NOT NULL THEN 1 ELSE 0 END)
                FROM permits 
                WHERE UPPER(contractor_name) LIKE '%NEW VIEW%' 
                   OR UPPER(contractor_name) LIKE '%NEWVIEW%'
            """)
            summary = cur.fetchone()
            print(f"\nPermits Summary: Count={summary[0]}, Earliest={summary[1]}, Latest={summary[2]}, Total Val=${summary[3]:,}, Matched to Parcels={summary[4]}")
            
            cur.execute("""
                SELECT permit_no, city, address, contractor_name, issued, valuation, kind, scope, parcel_ids
                FROM permits
                WHERE UPPER(contractor_name) LIKE '%NEW VIEW%' 
                   OR UPPER(contractor_name) LIKE '%NEWVIEW%'
                ORDER BY issued DESC LIMIT 5
            """)
            print("\nSample permits:")
            for p in cur.fetchall():
                print(" ", p)

        # In contractors table if exists
        for c_tab in ['contractors', 'contractor']:
            if c_tab in tables:
                cur.execute(f"SELECT * FROM {c_tab} WHERE UPPER(name) LIKE '%NEW VIEW%' OR UPPER(name) LIKE '%NEWVIEW%'")
                print(f"\n{c_tab} table records:")
                for r in cur.fetchall():
                    print(" ", r)

        conn.close()
    except Exception as e:
        print(f"Error inspecting {name}: {e}")

inspect_db(db_path, "Main depoii.sqlite")
inspect_db(engine_path, "Data Engine depoii_local.db")

