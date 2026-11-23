import sqlite3
import json
import os
from datetime import datetime, timezone

DB_PATH = 'd:/Depoii_nextjs/data/depoii.sqlite'
JSON_PATH = 'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/frisco_permits_new_view_roofing.json'

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    permits = json.load(f)

inserted = 0
skipped = 0
now = datetime.now(timezone.utc).isoformat()

# Frisco default coords
DEFAULT_LAT = 33.150674
DEFAULT_LNG = -96.823612

for p in permits:
    permit_num = p['permitNumber']
    addr = p['address']
    contractor = 'New View Roofing'
    record_id = p.get('recordId', '')
    parent_proj = p.get('parentProject', '')
    
    # Check if exists
    cur.execute("SELECT permit_no FROM permits WHERE permit_no = ?", (permit_num,))
    if cur.fetchone():
        skipped += 1
        continue
        
    kind = 'Commercial Roofing' if ('COM' in permit_num or 'C1' in permit_num) else 'Residential Roofing'
    scope = f"Roofing permit issued in Frisco (Project: {parent_proj}, Ref: {record_id}, Contractor: {p.get('contractor')})"
    record_url = f"https://etrakit.friscotexas.gov/etrakit/search/permit.aspx"
    
    # Extract approximate issue year if available
    issued = '2019-01-01'
    if permit_num.startswith('B17') or ':17' in record_id:
        issued = '2017-06-01'
    elif permit_num.startswith('B18') or ':18' in record_id:
        issued = '2018-06-01'
    elif permit_num.startswith('B19') or ':19' in record_id:
        issued = '2019-06-01'
    elif permit_num.startswith('ROOF20') or ':20' in record_id:
        issued = '2020-06-01'
    elif permit_num.startswith('ROOF21') or ':21' in record_id:
        issued = '2021-06-01'
    elif permit_num.startswith('ROOF26') or ':26' in record_id:
        issued = '2026-06-01'

    cur.execute("""
        INSERT INTO permits (
            permit_no, kind, address, city, contractor_name, contractor_state,
            issued, valuation, scope, membrane, lat, lng, parcel_ids, record_url, portal, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        permit_num,
        kind,
        f"{addr}, Frisco, TX",
        'Frisco',
        contractor,
        'TX',
        issued,
        0,
        scope,
        'Shingle / Modified Bitumen / TPO',
        DEFAULT_LAT,
        DEFAULT_LNG,
        '[]',
        record_url,
        'Frisco eTRAKiT',
        now
    ))
    inserted += 1

conn.commit()

cur.execute("SELECT COUNT(*) FROM permits")
total_after = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM permits WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'")
nv_after = cur.fetchone()[0]

print(f"Ingestion complete: {inserted} inserted, {skipped} skipped.")
print(f"Total permits now: {total_after}")
print(f"Total New View Roofing permits now: {nv_after}")
conn.close()
