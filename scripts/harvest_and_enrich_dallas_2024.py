import urllib.request
import urllib.parse
import json
import sqlite3
import re
import os
import shutil
import uuid
from datetime import datetime, timezone

PRIMARY_DB = 'd:/Depoii_nextjs/data/depoii.sqlite'
LANDING_DB = 'd:/Depoii_nextjs/landing-sites/depoii-landing-build/data/depoii.sqlite'
STANDALONE_DB = 'd:/Depoii_nextjs/.next/standalone/data/depoii.sqlite'
DATA_ENGINE_DB = 'd:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db'
BACKUP_JSON = 'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/dallas_2024_roofing_permits_harvested.json'

# --- PHASE 1: HARVEST FROM SOCRATA API ---
print("=== PHASE 1: Harvesting 2024 Dallas Roofing Permits from Socrata API ===")
base_url = "https://www.dallasopendata.com/resource/e7gq-4sah.json"
where_clause = "issued_date like '%24' and (upper(work_description) like '%ROOF%' or upper(permit_type) like '%ROOF%')"

all_harvested = []
offset = 0
limit = 1000

while True:
    params = {
        "$where": where_clause,
        "$limit": limit,
        "$offset": offset,
        "$order": "issued_date asc"
    }
    encoded_url = f"{base_url}?{urllib.parse.urlencode(params)}"
    print(f"Fetching records offset={offset} limit={limit}...")
    
    req = urllib.request.Request(encoded_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if not data:
                break
            all_harvested.extend(data)
            print(f"  Received {len(data)} records (Total so far: {len(all_harvested)})")
            if len(data) < limit:
                break
            offset += limit
    except Exception as e:
        print(f"  Error at offset {offset}: {e}")
        break

print(f"\nTotal harvested from Socrata: {len(all_harvested)}")

# Save backup
with open(BACKUP_JSON, 'w', encoding='utf-8') as f:
    json.dump(all_harvested, f, indent=2)
print(f"Saved raw harvested backup to {BACKUP_JSON}")


# --- PHASE 2: PREPARE PARCEL MATCHING INDEX ---
print("\n=== PHASE 2: Indexing Dallas Tax Parcels for Linking ===")
conn = sqlite3.connect(PRIMARY_DB)
cur = conn.cursor()

cur.execute("""
    SELECT account, address, lat, lng, owner, sqft 
    FROM parcels 
    WHERE city = 'Dallas'
""")
parcels_data = cur.fetchall()
print(f"Loaded {len(parcels_data):,} Dallas tax parcels.")

def normalize_addr(a):
    if not a:
        return ""
    a = a.upper().strip()
    a = re.sub(r'[,#\.\-\/]', ' ', a)
    a = re.sub(r'\s+', ' ', a)
    replacements = {
        ' STREET': ' ST', ' AVENUE': ' AVE', ' BOULEVARD': ' BLVD', ' DRIVE': ' DR',
        ' ROAD': ' RD', ' LANE': ' LN', ' COURT': ' CT', ' CIRCLE': ' CIR',
        ' PARKWAY': ' PKWY', ' HIGHWAY': ' HWY', ' TRAIL': ' TRL', ' PLACE': ' PL',
        ' TERRACE': ' TER', ' EXPRESSWAY': ' EXPY'
    }
    for full, abbr in replacements.items():
        if a.endswith(full):
            a = a[:-len(full)] + abbr
        a = a.replace(full + ' ', abbr + ' ')
    return a.strip()

parcel_exact_index = {}
parcel_num_street_index = {}

for p in parcels_data:
    acc, paddr, plat, plng, powner, psqft = p
    norm = normalize_addr(paddr)
    parcel_exact_index[norm] = p
    
    m = re.match(r'^(\d+)\s+([A-Z0-9]+)', norm)
    if m:
        key = f"{m.group(1)} {m.group(2)}"
        if key not in parcel_num_street_index:
            parcel_num_street_index[key] = []
        parcel_num_street_index[key].append(p)

print(f"Indexed {len(parcel_exact_index):,} exact normalized parcel addresses.")


# --- PHASE 3: PARSING, NORMALIZATION & INGESTION ---
print("\n=== PHASE 3: Normalizing and Ingesting into depoii.sqlite ===")

def parse_date(d_str):
    if not d_str:
        return '2024-01-01'
    d_str = d_str.strip()
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2})$', d_str)
    if m:
        month = m.group(1).zfill(2)
        day = m.group(2).zfill(2)
        return f"2024-{month}-{day}"
    return '2024-01-01'

def detect_membrane(desc, ptype):
    text = f"{desc} {ptype}".upper()
    if 'TPO' in text:
        return 'TPO'
    if 'EPDM' in text:
        return 'EPDM'
    if 'MODIFIED BITUMEN' in text or 'MOD BIT' in text or 'HOT MOP' in text:
        return 'Modified Bitumen'
    if 'METAL' in text or 'STANDING SEAM' in text:
        return 'Metal'
    if 'SOLAR' in text or 'PV' in text:
        return 'Rooftop Solar Array'
    if 'TILE' in text or 'SLATE' in text:
        return 'Tile / Slate'
    if 'BUR' in text or 'BUILT-UP' in text or 'TAR' in text:
        return 'Built-Up Roof (BUR)'
    if 'COATING' in text or 'SILICONE' in text or 'FOAM' in text:
        return 'Roof Coating / Silicone'
    return 'Architectural Shingle'

def clean_contractor(c_str):
    if not c_str or c_str.strip() == '':
        return 'Owner / Self-Contractor'
    c_str = c_str.strip()
    # If MOB / New View
    if 'NEW VIEW' in c_str.upper() or 'MOB HOME' in c_str.upper():
        return 'New View Roofing'
    # Socrata often formats: "COMPANY NAME 123 STREET, Dallas, TX 75201 (214) 555-1234"
    # Extract company name by stripping trailing address/phone if present
    # Look for street number or Suite
    m = re.match(r'^([A-Z0-9\s\&\.\,\'-]+?)(?:\s+\d{2,}\s+[A-Z0-9]|\s+(?:SUITE|STE|BLDG|PO BOX|HWY|PKWY)|\s*\(\d{3}\))', c_str, re.IGNORECASE)
    if m and len(m.group(1).strip()) > 3:
        cleaned = m.group(1).strip()
        # strip trailing commas
        cleaned = re.sub(r'[\,\.\-]+$', '', cleaned).strip()
        if len(cleaned) > 2:
            return cleaned.title()
    # If short company string
    parts = c_str.split(',')
    if len(parts) > 1 and len(parts[0]) > 3:
        return parts[0].strip().title()
    return c_str[:60].strip().title()

now_iso = datetime.now(timezone.utc).isoformat()
DEFAULT_LAT = 32.7767
DEFAULT_LNG = -96.7970

inserted_count = 0
updated_count = 0
matched_parcel_count = 0

for item in all_harvested:
    pno = item.get('permit_number')
    if not pno:
        continue
        
    ptype = item.get('permit_type') or ''
    wdesc = item.get('work_description') or ''
    issued_raw = item.get('issued_date') or ''
    saddr = item.get('street_address') or ''
    zcode = item.get('zip_code') or ''
    val_raw = item.get('value')
    raw_contractor = item.get('contractor') or ''
    
    issued = parse_date(issued_raw)
    try:
        val = int(float(str(val_raw).replace('$', '').replace(',', '').strip())) if val_raw else 0
    except:
        val = 0
        
    contractor = clean_contractor(raw_contractor)
    membrane = detect_membrane(wdesc, ptype)
    
    # Classify kind
    ptype_upper = ptype.upper()
    if 'COMMERCIAL' in ptype_upper:
        kind = 'Commercial Roofing Permit'
    elif 'SOLAR' in ptype_upper or 'PV' in ptype_upper:
        kind = 'Residential Solar/PV Roofing'
    else:
        kind = 'Residential Roofing Permit'
        
    # Standardize address
    clean_street = saddr
    for sfx in [', Dallas, TX', ', DALLAS, TX', ', Dallas TX', ', DALLAS TX', ', TX']:
        if sfx.upper() in clean_street.upper():
            idx = clean_street.upper().find(sfx.upper())
            clean_street = clean_street[:idx]
    clean_street = clean_street.strip()
    
    full_addr = f"{clean_street}, Dallas, TX {zcode}".strip()
    
    # Match parcel
    norm_s = normalize_addr(clean_street)
    matched_parcel = parcel_exact_index.get(norm_s)
    if not matched_parcel:
        m = re.match(r'^(\d+)\s+([A-Z0-9]+)', norm_s)
        if m:
            key = f"{m.group(1)} {m.group(2)}"
            cands = parcel_num_street_index.get(key, [])
            if len(cands) == 1:
                matched_parcel = cands[0]
            elif len(cands) > 1:
                # pick closest or first
                matched_parcel = cands[0]
                
    if matched_parcel:
        acc, _, plat, plng, _, _ = matched_parcel
        parcel_ids = json.dumps([acc])
        lat = plat if plat else DEFAULT_LAT
        lng = plng if plng else DEFAULT_LNG
        matched_parcel_count += 1
    else:
        parcel_ids = '[]'
        lat = DEFAULT_LAT
        lng = DEFAULT_LNG
        
    scope = f"{ptype}: {wdesc}".strip()
    if not scope:
        scope = "Roofing Permit issued by City of Dallas"
        
    record_url = "https://www.dallasopendata.com/resource/e7gq-4sah"
    portal = "City of Dallas OpenData"
    
    # Check if exists
    cur.execute("SELECT permit_no FROM permits WHERE permit_no = ?", (pno,))
    existing = cur.fetchone()
    
    if existing:
        # Update existing record if parcel linkage or valuation was missing
        cur.execute("""
            UPDATE permits 
            SET parcel_ids = CASE WHEN parcel_ids = '[]' OR parcel_ids IS NULL THEN ? ELSE parcel_ids END,
                lat = CASE WHEN lat = ? THEN ? ELSE lat END,
                lng = CASE WHEN lng = ? THEN ? ELSE lng END,
                scope = CASE WHEN scope IS NULL OR scope = '' THEN ? ELSE scope END,
                membrane = CASE WHEN membrane IS NULL OR membrane = '' THEN ? ELSE membrane END,
                updated_at = ?
            WHERE permit_no = ?
        """, (parcel_ids, DEFAULT_LAT, lat, DEFAULT_LNG, lng, scope, membrane, now_iso, pno))
        updated_count += 1
    else:
        cur.execute("""
            INSERT INTO permits (
                permit_no, kind, address, city, contractor_name, contractor_state,
                issued, valuation, scope, membrane, lat, lng, parcel_ids, record_url, portal, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pno, kind, full_addr, 'Dallas', contractor, 'TX',
            issued, val, scope, membrane, lat, lng, parcel_ids, record_url, portal, now_iso
        ))
        inserted_count += 1

conn.commit()

# Check final counts in PRIMARY_DB
cur.execute("SELECT COUNT(*) FROM permits WHERE city = 'Dallas' AND SUBSTR(issued, 1, 4) = '2024'")
dallas_2024_final = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM permits")
total_final = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM permits WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'")
nv_final = cur.fetchone()[0]

conn.close()

print(f"\nIngestion Results in Primary DB ({PRIMARY_DB}):")
print(f"  New Permits Inserted: {inserted_count:,}")
print(f"  Existing Permits Updated: {updated_count:,}")
print(f"  Permits Matched to DCAD Tax Parcels: {matched_parcel_count:,}")
print(f"  City of Dallas 2024 Permits Now: {dallas_2024_final:,}")
print(f"  Total Permits Across Database: {total_final:,}")
print(f"  Total New View Roofing Permits: {nv_final:,}")


# --- PHASE 4: SYNCHRONIZE TO LANDING, STANDALONE & DATA ENGINE ---
print("\n=== PHASE 4: Synchronizing Database Across Platform Copies ===")

if os.path.exists(os.path.dirname(LANDING_DB)):
    shutil.copy2(PRIMARY_DB, LANDING_DB)
    print(f"  Copied {PRIMARY_DB} -> {LANDING_DB}")

if os.path.exists(os.path.dirname(STANDALONE_DB)):
    shutil.copy2(PRIMARY_DB, STANDALONE_DB)
    print(f"  Copied {PRIMARY_DB} -> {STANDALONE_DB}")

# Also sync new records into Data Engine
de_conn = sqlite3.connect(DATA_ENGINE_DB)
de_cur = de_conn.cursor()

de_cur.execute("SELECT raw_permit_number FROM normalized_permits WHERE city = 'Dallas'")
existing_de_pnos = set(r[0] for r in de_cur.fetchall())
print(f"Existing Dallas permits in Data Engine: {len(existing_de_pnos):,}")

# Read from PRIMARY_DB newly inserted permits
p_conn = sqlite3.connect(PRIMARY_DB)
p_cur = p_conn.cursor()
p_cur.execute("""
    SELECT permit_no, kind, address, city, contractor_name, issued, valuation, scope, membrane, lat, lng, portal
    FROM permits 
    WHERE city = 'Dallas' AND SUBSTR(issued, 1, 4) = '2024'
""")
all_dallas_2024 = p_cur.fetchall()

de_inserted = 0
for row in all_dallas_2024:
    pno, kind, addr, city, contractor, issued, val, scope, memb, lat, lng, portal = row
    if pno in existing_de_pnos:
        continue
        
    pid = f"PERM-{uuid.uuid4().hex[:12].upper()}"
    de_cur.execute("""
        INSERT INTO normalized_permits (
            id, raw_permit_number, jurisdiction_id, jurisdiction, state, city,
            issue_date, status, normalized_address, valuation, valuation_formatted,
            category, probable_roof_system, raw_description, contractor_name,
            latitude, longitude, normalized_at, permit_scope, data_source, retrieved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        pid, pno, 'JUR-DALLAS', 'City of Dallas', 'TX', 'Dallas',
        issued, 'Issued', addr, float(val), f"${val:,.2f}",
        'Commercial' if 'Commercial' in kind else 'Residential',
        memb, scope, contractor,
        lat, lng, now_iso, scope, portal, now_iso
    ))
    de_inserted += 1

de_conn.commit()
de_conn.close()
p_conn.close()

print(f"Data Engine sync complete: {de_inserted:,} newly normalized Dallas 2024 permits inserted.")
print("\n=== ALL PHASES COMPLETED SUCCESSFULLY ===")

