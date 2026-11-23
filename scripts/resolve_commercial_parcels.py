import sqlite3
import urllib.parse
import urllib.request
import json
import ssl
import time
import re
from datetime import datetime

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

DB_PATH = 'd:/Depoii_nextjs/data/depoii.sqlite'

def clean_address(addr):
    if not addr:
        return ''
    # Remove state and zip
    addr_clean = re.sub(r',\s*Dallas\s*TX.*$', '', addr, flags=re.I)
    addr_clean = re.sub(r',\s*Dallas,\s*TX.*$', '', addr_clean, flags=re.I)
    addr_clean = re.sub(r',\s*TX.*$', '', addr_clean, flags=re.I)
    addr_clean = re.sub(r',\s*Dallas.*$', '', addr_clean, flags=re.I)
    addr_clean = re.sub(r'\s+TX\s*\d*$', '', addr_clean, flags=re.I)
    return addr_clean.strip()

def geocode_address(addr_clean):
    query_addr = f"{addr_clean}, Dallas, TX"
    url = 'https://gis.dallascityhall.com/arcgis/rest/services/Pbw_public/ROWMSDallasStreetsLocator/GeocodeServer/findAddressCandidates?' + urllib.parse.urlencode({
        'SingleLine': query_addr,
        'f': 'json',
        'outSR': '4326', # Also get standard lat/long
        'maxLocations': 1
    })
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            cands = data.get('candidates', [])
            if cands and cands[0].get('score', 0) >= 75:
                cand = cands[0]
                # We need projected coordinates (2276) for spatial intersect OR we query parcel with 4326
                return cand['location']['x'], cand['location']['y'], cand.get('score', 0)
    except Exception as e:
        pass
    return None, None, 0

def find_parcel_at_point(lng, lat):
    # Query DallasTaxParcels using WGS84 (4326) geometry
    # Buffer around point approx 0.0003 deg (~30m)
    buf = 0.00025
    env = f"{lng - buf},{lat - buf},{lng + buf},{lat + buf}"
    params = urllib.parse.urlencode({
        'geometry': env,
        'geometryType': 'esriGeometryEnvelope',
        'spatialRel': 'esriSpatialRelIntersects',
        'inSR': '4326',
        'outSR': '4326',
        'outFields': 'ACCT,GIS_ACCT,ST_NUM,ST_DIR,ST_NAME,ST_TYPE,TAXPANAME1,TAXPAADD1,TAXPACITY,TAXPASTA,TAXPAZIP,AREA_FEET,APPRAISALYEAR,PROP_CL',
        'f': 'json',
        'resultRecordCount': 1
    })
    url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?{params}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            feats = data.get('features', [])
            if feats:
                return feats[0]['attributes']
    except Exception as e:
        pass
    return None

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        SELECT DISTINCT address
        FROM permits
        WHERE (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
          AND (parcel_ids = '[]' OR parcel_ids IS NULL)
    """)
    distinct_addrs = [r[0] for r in cur.fetchall() if r[0]]
    print(f"Total distinct unmatched commercial addresses to resolve: {len(distinct_addrs)}")

    resolved_map = {} # addr -> {account, owner, address, sqft, lat, lng, record_url}
    
    start_time = time.time()
    count = 0
    matched = 0

    for raw_addr in distinct_addrs:
        count += 1
        addr_clean = clean_address(raw_addr)
        lng, lat, score = geocode_address(addr_clean)
        
        # If suite in address, also try without suite
        if not lng and ('#' in addr_clean or 'STE' in addr_clean.upper()):
            base_clean = re.sub(r'[\s,#].*(STE|SUITE|APT|UNIT|#).*$', '', addr_clean, flags=re.I).strip()
            lng, lat, score = geocode_address(base_clean)

        if lng and lat:
            parcel_attr = find_parcel_at_point(lng, lat)
            if parcel_attr:
                acct = parcel_attr.get('ACCT')
                if not acct or acct == 'MULTIPLE':
                    acct = parcel_attr.get('GIS_ACCT')
                
                if acct and acct != 'MULTIPLE':
                    owner = parcel_attr.get('TAXPANAME1') or 'COMMERCIAL PROPERTY OWNER'
                    st_num = parcel_attr.get('ST_NUM') or ''
                    st_name = parcel_attr.get('ST_NAME') or ''
                    st_type = parcel_attr.get('ST_TYPE') or ''
                    p_addr = f"{st_num} {st_name} {st_type}".strip()
                    if not p_addr:
                        p_addr = addr_clean
                    
                    sqft = 0
                    try:
                        sqft = int(float(parcel_attr.get('AREA_FEET') or 0))
                    except:
                        pass
                    
                    owner_addr = parcel_attr.get('TAXPAADD1') or ''
                    dcad_key = f"DCAD:{acct}"
                    record_url = f"https://www.dallascad.org/AcctDetailCom.aspx?ID={acct}"

                    resolved_map[raw_addr] = {
                        'account': dcad_key,
                        'owner': owner.strip(),
                        'address': p_addr,
                        'sqft': sqft,
                        'lat': lat,
                        'lng': lng,
                        'owner_address': owner_addr.strip(),
                        'record_url': record_url
                    }
                    matched += 1

        if count % 25 == 0 or count == len(distinct_addrs):
            print(f"Processed {count}/{len(distinct_addrs)} | Matched so far: {matched} ({matched/count*100:.1f}%) | Elapsed: {time.time()-start_time:.1f}s")
            time.sleep(0.1)

    print(f"\nBatch Geocode & Parcel Spatial Resolution Complete!")
    print(f"Resolved {matched}/{len(distinct_addrs)} unique addresses.")

    # 1. Ingest newly discovered parcels into `parcels` table
    print("Ingesting resolved parcels into `parcels` table...")
    now_iso = datetime.utcnow().isoformat() + "Z"
    parcels_inserted = 0
    parcels_updated = 0

    for r_addr, pdata in resolved_map.items():
        cur.execute("SELECT account FROM parcels WHERE account = ?", (pdata['account'],))
        exists = cur.fetchone()
        if not exists:
            cur.execute("""
                INSERT INTO parcels (account, owner, address, city, year_built, sqft, lat, lng, owner_address, record_url, updated_at)
                VALUES (?, ?, ?, 'Dallas', 0, ?, ?, ?, ?, ?, ?)
            """, (pdata['account'], pdata['owner'], pdata['address'], pdata['sqft'], pdata['lat'], pdata['lng'], pdata['owner_address'], pdata['record_url'], now_iso))
            parcels_inserted += 1
        else:
            parcels_updated += 1

    conn.commit()
    print(f"Parcels table: {parcels_inserted} new parcels inserted, {parcels_updated} existing parcels referenced.")

    # 2. Update permits table with parcel_ids, lat, lng
    print("Linking matched parcels to commercial permits...")
    permits_updated = 0
    for raw_addr, pdata in resolved_map.items():
        p_json = json.dumps([pdata['account']])
        cur.execute("""
            UPDATE permits
            SET parcel_ids = ?, lat = ?, lng = ?, updated_at = ?
            WHERE address = ? 
              AND (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
              AND (parcel_ids = '[]' OR parcel_ids IS NULL)
        """, (p_json, pdata['lat'], pdata['lng'], now_iso, raw_addr))
        permits_updated += cur.rowcount

    conn.commit()
    print(f"Successfully updated {permits_updated} commercial permits with valid DCAD parcel links!")

    # Check remaining unmatched commercial permits
    cur.execute("""
        SELECT count(*)
        FROM permits
        WHERE (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
          AND (parcel_ids = '[]' OR parcel_ids IS NULL)
    """)
    rem = cur.fetchone()[0]
    print(f"Remaining unmatched commercial permits: {rem}")

    conn.close()

if __name__ == '__main__':
    main()

