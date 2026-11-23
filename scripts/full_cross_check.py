import sqlite3
import json
import re

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Get all parcels
cur.execute("SELECT account, owner, address, city, year_built, sqft, lat, lng, record_url FROM parcels")
all_parcels = cur.fetchall()
print(f"Total parcels in DB: {len(all_parcels)}")

# Build lookup index for parcels
# Normalize address: uppercase, strip punctuation, standardize suffixes
def normalize_addr(a):
    if not a:
        return ""
    a = a.upper().strip()
    a = re.sub(r'[,#\.\-\/]', ' ', a)
    a = re.sub(r'\s+', ' ', a)
    # Standard street suffix abbreviations
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

# Build index by normalized address and street number + name
parcel_index = {}
street_num_name_index = {}

for p in all_parcels:
    acc, owner, paddr, pcity, yr, sqft, lat, lng, url = p
    norm = normalize_addr(paddr)
    parcel_index[norm] = p
    
    # Extract street number and first 2 words of street name
    m = re.match(r'^(\d+)\s+([A-Z0-9]+)\s*([A-Z0-9]*)', norm)
    if m:
        key = f"{m.group(1)} {m.group(2)}"
        if key not in street_num_name_index:
            street_num_name_index[key] = []
        street_num_name_index[key].append(p)

print(f"Indexed {len(parcel_index)} normalized parcel addresses.")

# Query all New View Roofing permits
cur.execute("""
    SELECT permit_no, kind, address, city, contractor_name, issued, valuation, scope, membrane, parcel_ids, record_url
    FROM permits
    WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'
""")
nv_permits = cur.fetchall()
print(f"Total New View Roofing permits in DB: {len(nv_permits)}")

# Classification criteria
commercial_keywords = [
    'COMMERCIAL', 'OFFICE', 'RETAIL', 'TPO', 'MULTI-FAMILY', 'APARTMENT',
    'RESTAURANT', 'FLAT ROOF', 'EPDM', 'MODIFIED BITUMEN', 'HOT MOP', 'COM-'
]

commercial_permits = []
residential_permits = []
matched_buildings = []

for p in nv_permits:
    pno, kind, addr, city, contractor, issued, val, scope, memb, parcel_ids, rec_url = p
    
    # Classify
    combined_text = f"{pno} {kind} {scope} {memb}".upper()
    is_commercial = False
    if 'COMMERCIAL' in kind.upper() or 'MULTI-FAMILY' in kind.upper():
        is_commercial = True
    elif any(kw in combined_text for kw in commercial_keywords):
        is_commercial = True
    
    if is_commercial:
        commercial_permits.append(p)
    else:
        residential_permits.append(p)
        
    # Check address matching
    # Strip city/state from permit address (e.g., "5329 REIGER AVE, Dallas TX, 5329" -> "5329 REIGER AVE")
    clean_addr = addr
    for suffix in [', Dallas TX', ', DALLAS TX', ', Frisco, TX', ', FRISCO, TX', ', IRVING TX', ', Fort Worth, TX']:
        if suffix.upper() in clean_addr.upper():
            clean_addr = clean_addr[:clean_addr.upper().find(suffix.upper())]
    # Remove trailing zip or repeats
    clean_addr = re.sub(r',\s*\d+$', '', clean_addr)
    norm_paddr = normalize_addr(clean_addr)
    
    matched_parcel = parcel_index.get(norm_paddr)
    if not matched_parcel:
        # Try street number + name prefix match
        m = re.match(r'^(\d+)\s+([A-Z0-9]+)', norm_paddr)
        if m:
            key = f"{m.group(1)} {m.group(2)}"
            candidates = street_num_name_index.get(key, [])
            for c in candidates:
                # check city match or near match
                if city.upper() in c[3].upper() or c[3].upper() in city.upper():
                    matched_parcel = c
                    break
            if not matched_parcel and len(candidates) == 1:
                matched_parcel = candidates[0]
                
    # Also check if parcel_ids was already set
    if not matched_parcel and parcel_ids and parcel_ids != '[]':
        try:
            pids = json.loads(parcel_ids)
            if pids:
                cur.execute("SELECT account, owner, address, city, year_built, sqft, lat, lng, record_url FROM parcels WHERE account = ?", (pids[0],))
                matched_parcel = cur.fetchone()
        except:
            pass

    if matched_parcel:
        matched_buildings.append({
            'permit_no': pno,
            'kind': kind,
            'is_commercial': is_commercial,
            'permit_address': addr,
            'permit_scope': scope,
            'valuation': val,
            'issued': issued,
            'parcel_account': matched_parcel[0],
            'owner': matched_parcel[1],
            'parcel_address': matched_parcel[2],
            'parcel_city': matched_parcel[3],
            'year_built': matched_parcel[4],
            'sqft': matched_parcel[5],
            'dcad_url': matched_parcel[8]
        })

print("\n================ SUMMARY ================")
print(f"Total New View Roofing Permits: {len(nv_permits)}")
print(f"  -> Commercial / Multi-Family: {len(commercial_permits)}")
print(f"  -> Residential: {len(residential_permits)}")
print(f"Permits Matched to Depoii Buildings/Parcels: {len(matched_buildings)}")

# Unique parcels matched
unique_parcels = {}
for m in matched_buildings:
    acc = m['parcel_account']
    if acc not in unique_parcels:
        unique_parcels[acc] = []
    unique_parcels[acc].append(m)

print(f"Unique Buildings/Parcels Matched: {len(unique_parcels)}")

print("\n--- MATCHED BUILDINGS BREAKDOWN ---")
for acc, plist in unique_parcels.items():
    p0 = plist[0]
    print(f"\nBuilding Account: {acc}")
    print(f"  Address: {p0['parcel_address']}, {p0['parcel_city']}")
    print(f"  Owner: {p0['owner']}")
    print(f"  Year Built: {p0['year_built']} | Sqft: {p0['sqft']:,} sq ft")
    print(f"  DCAD/TAD URL: {p0['dcad_url']}")
    print(f"  Associated Permits ({len(plist)}):")
    for pm in plist:
        comm_tag = "[COMMERCIAL]" if pm['is_commercial'] else "[RESIDENTIAL]"
        print(f"    - {pm['permit_no']} {comm_tag} (Issued: {pm['issued']}, Val: ${pm['valuation']:,})")
        print(f"      Scope: {pm['permit_scope'][:80]}")

conn.close()

