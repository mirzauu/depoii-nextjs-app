import sqlite3
import shutil
import os
import uuid
from datetime import datetime, timezone

PRIMARY_DB = 'd:/Depoii_nextjs/data/depoii.sqlite'
LANDING_DB = 'd:/Depoii_nextjs/landing-sites/depoii-landing-build/data/depoii.sqlite'
STANDALONE_DB = 'd:/Depoii_nextjs/.next/standalone/data/depoii.sqlite'
DATA_ENGINE_DB = 'd:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db'

print(f"--- 1. Syncing Primary SQLite DB to landing and standalone copies ---")
if os.path.exists(os.path.dirname(LANDING_DB)):
    shutil.copy2(PRIMARY_DB, LANDING_DB)
    print(f"Copied {PRIMARY_DB} -> {LANDING_DB}")

if os.path.exists(os.path.dirname(STANDALONE_DB)):
    shutil.copy2(PRIMARY_DB, STANDALONE_DB)
    print(f"Copied {PRIMARY_DB} -> {STANDALONE_DB}")

print(f"\n--- 2. Syncing New View Roofing permits into Data Engine ({DATA_ENGINE_DB}) ---")
p_conn = sqlite3.connect(PRIMARY_DB)
p_cur = p_conn.cursor()

p_cur.execute("""
    SELECT permit_no, kind, address, city, contractor_name, issued, valuation, scope, membrane, lat, lng, parcel_ids, record_url, portal
    FROM permits
    WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'
""")
primary_nv_permits = p_cur.fetchall()
print(f"Permits to sync from primary: {len(primary_nv_permits)}")

de_conn = sqlite3.connect(DATA_ENGINE_DB)
de_cur = de_conn.cursor()

de_cur.execute("PRAGMA table_info(normalized_permits)")
de_cols = [r[1] for r in de_cur.fetchall()]

# Existing permit numbers in DE
de_cur.execute("SELECT raw_permit_number FROM normalized_permits")
existing_de_pnums = set(r[0] for r in de_cur.fetchall())
print(f"Existing raw_permit_numbers in Data Engine: {len(existing_de_pnums)}")

de_inserted = 0
now_iso = datetime.now(timezone.utc).isoformat()

for p in primary_nv_permits:
    pno, kind, addr, city, contractor, issued, val, scope, memb, lat, lng, parcel_ids, rec_url, portal = p
    
    if pno in existing_de_pnums:
        continue
        
    pid = f"PERM-{uuid.uuid4().hex[:12].upper()}"
    
    row = {
        'id': pid,
        'raw_permit_number': pno,
        'jurisdiction_id': f"JUR-{city.upper()}",
        'jurisdiction': f"City of {city}",
        'state': 'TX',
        'city': city,
        'issue_date': issued,
        'status': 'Issued',
        'normalized_address': addr,
        'valuation': float(val) if val else 0.0,
        'valuation_formatted': f"${val:,.2f}" if val else "$0.00",
        'category': 'Commercial' if 'Commercial' in kind else 'Residential',
        'probable_roof_system': memb or 'Shingle',
        'raw_description': scope,
        'contractor_name': 'New View Roofing',
        'contractor_id': 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA',
        'latitude': lat,
        'longitude': lng,
        'normalized_at': now_iso,
        'permit_scope': scope,
        'data_source': portal,
        'retrieved_at': now_iso
    }
    
    valid_row = {k: v for k, v in row.items() if k in de_cols}
    col_str = ", ".join(valid_row.keys())
    q_str = ", ".join(["?"] * len(valid_row))
    
    de_cur.execute(f"INSERT INTO normalized_permits ({col_str}) VALUES ({q_str})", list(valid_row.values()))
    de_inserted += 1

# Also update canonical_contractors total_permits for New View Roofing
de_cur.execute("""
    SELECT COUNT(*), SUM(valuation) 
    FROM normalized_permits 
    WHERE contractor_name LIKE '%New View%' OR contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'
""")
total_nv_cnt, total_nv_val = de_cur.fetchone()

de_cur.execute("""
    UPDATE canonical_contractors 
    SET total_permits = ?, total_valuation = ?, updated_at = ?
    WHERE id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'
""", (total_nv_cnt, total_nv_val or 0.0, now_iso))

de_conn.commit()
de_conn.close()
p_conn.close()

print(f"Data Engine sync complete: {de_inserted} new permits inserted.")
print(f"Updated CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA total_permits to: {total_nv_cnt}")

print("\n--- 3. Verifying Final Permit Counts Across All Databases ---")
target_dbs = [PRIMARY_DB, LANDING_DB, STANDALONE_DB, DATA_ENGINE_DB]
for db in target_dbs:
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    
    if 'permits' in tables:
        cur.execute("SELECT COUNT(*) FROM permits")
        tot = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM permits WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'")
        nv = cur.fetchone()[0]
        print(f"{os.path.basename(db)}: Total Permits = {tot:,} | Under New View Roofing = {nv}")
    elif 'normalized_permits' in tables:
        cur.execute("SELECT COUNT(*) FROM normalized_permits")
        tot = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM normalized_permits WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'")
        nv = cur.fetchone()[0]
        print(f"{os.path.basename(db)} (Data Engine): Total Permits = {tot:,} | Under New View Roofing = {nv}")
    conn.close()

