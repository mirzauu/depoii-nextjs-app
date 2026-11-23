import sqlite3
import psycopg2

def check_commercial_nv():
    # 1. Check local SQLite DB
    conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
    cur = conn.cursor()
    cur.execute("""
        SELECT permit_no, address, city, kind, valuation, scope, parcel_ids
        FROM permits
        WHERE UPPER(contractor_name) LIKE '%NEW VIEW%'
          AND (
            UPPER(kind) LIKE '%COMMERCIAL%' 
            OR UPPER(scope) LIKE '%COMMERCIAL%'
            OR UPPER(scope) LIKE '%TPO%'
            OR UPPER(scope) LIKE '%FLAT ROOF%'
            OR valuation > 50000
          )
    """)
    sqlite_rows = cur.fetchall()
    print("=== SQLite Commercial Permits for New View Roofing ===")
    for r in sqlite_rows:
        print(f"Permit: {r[0]} | City: {r[2]} | Addr: {r[1]} | Kind: {r[3]} | Val: ${r[4]:,} | Scope: {r[5][:80]}")
    
    # Check all kinds in SQLite
    cur.execute("""
        SELECT kind, count(*), count(distinct address)
        FROM permits
        WHERE UPPER(contractor_name) LIKE '%NEW VIEW%'
        GROUP BY kind
    """)
    print("\nSQLite Permits by Kind:")
    for r in cur.fetchall():
        print(f"  {r[0]}: {r[1]} permits across {r[2]} distinct buildings")
    conn.close()

    # 2. Check Postgres Warehouse
    db_url = None
    with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
                break
    pg_conn = psycopg2.connect(db_url, sslmode='require')
    pg_cur = pg_conn.cursor()
    
    pg_cur.execute("""
        SELECT pm.raw_permit_number, pm.city, pm.normalized_address, pm.category, pm.valuation, pm.raw_description, p.property_type, p.owner_name
        FROM warehouse.normalized_permits pm
        LEFT JOIN warehouse.parcels p ON (
            (pm.parcel_id IS NOT NULL AND pm.parcel_id <> '' AND (p.id = pm.parcel_id OR p.account_number = pm.parcel_id))
            OR (LOWER(TRIM(p.address)) = LOWER(TRIM(pm.normalized_address)) AND LOWER(p.city) = LOWER(pm.city))
        )
        WHERE (LOWER(pm.contractor_name) = LOWER('New View Roofing') OR pm.contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA')
          AND (
            LOWER(pm.category) LIKE '%commercial%'
            OR LOWER(pm.raw_description) LIKE '%commercial%'
            OR LOWER(pm.raw_description) LIKE '%tpo%'
            OR LOWER(COALESCE(p.property_type, '')) LIKE '%commercial%'
            OR pm.valuation > 50000
          )
    """)
    pg_rows = pg_cur.fetchall()
    print("\n=== Postgres Warehouse Commercial Matches ===")
    for r in pg_rows:
        print(f"Permit: {r[0]} | City: {r[1]} | Addr: {r[2]} | Cat: {r[3]} | Val: ${r[4]:,} | PropType: {r[6]} | Owner: {r[7]} | Scope: {r[5][:80] if r[5] else ''}")

    # Count distinct commercial buildings
    pg_cur.execute("""
        SELECT COUNT(DISTINCT COALESCE(p.id, p.account_number, pm.normalized_address))
        FROM warehouse.normalized_permits pm
        LEFT JOIN warehouse.parcels p ON (
            (pm.parcel_id IS NOT NULL AND pm.parcel_id <> '' AND (p.id = pm.parcel_id OR p.account_number = pm.parcel_id))
            OR (LOWER(TRIM(p.address)) = LOWER(TRIM(pm.normalized_address)) AND LOWER(p.city) = LOWER(pm.city))
        )
        WHERE (LOWER(pm.contractor_name) = LOWER('New View Roofing') OR pm.contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA')
          AND (
            LOWER(pm.category) LIKE '%commercial%'
            OR LOWER(pm.raw_description) LIKE '%commercial%'
            OR LOWER(pm.raw_description) LIKE '%tpo%'
            OR LOWER(COALESCE(p.property_type, '')) LIKE '%commercial%'
          )
    """)
    comm_bldgs = pg_cur.fetchone()[0]
    print(f"\nTOTAL DISTINCT COMMERCIAL BUILDINGS: {comm_bldgs}")

    pg_conn.close()

check_commercial_nv()

