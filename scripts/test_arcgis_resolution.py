import sqlite3
import re
import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Get sample of unmatched commercial permits
cur.execute("""
    SELECT permit_no, address, valuation
    FROM permits
    WHERE (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
      AND (parcel_ids = '[]' OR parcel_ids IS NULL)
    ORDER BY valuation DESC
    LIMIT 10
""")
samples = cur.fetchall()

def parse_address(addr):
    # e.g., '6300 HARRY HINES BLVD, Dallas, TX' or '12500 TI BLVD, Dallas, TX 75243'
    clean = addr.split(',')[0].strip().upper()
    # Remove unit/ste
    clean = re.sub(r'\s+(STE|SUITE|APT|UNIT|BLDG|#).*$', '', clean)
    m = re.match(r'^(\d+)\s+(.+)$', clean)
    if m:
        num = m.group(1)
        street = m.group(2).strip()
        # strip standard suffixes to match prefix in GIS
        parts = street.split()
        if len(parts) > 1 and parts[-1] in ['BLVD', 'ST', 'AVE', 'RD', 'DR', 'PKWY', 'FWY', 'LN', 'CT', 'CIR', 'WAY', 'TRL', 'PL']:
            st_name = ' '.join(parts[:-1])
        else:
            st_name = street
        return num, st_name, street
    return None, None, clean

print("Testing ArcGIS Resolution on Top Sample Addresses:")
for permit_no, addr, val in samples:
    num, st_name, full_street = parse_address(addr)
    print(f"\nPermit: {permit_no} | Original: '{addr}' -> num='{num}', st_name='{st_name}'")
    if not num:
        continue
    
    # Query ArcGIS
    where = f"ST_NUM='{num}' AND ST_NAME LIKE '{st_name}%'"
    url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?where={urllib.parse.quote(where)}&outFields=ACCT,GIS_ACCT,ST_NUM,ST_NAME,ST_TYPE,TAXPANAME1,AREA_FEET,APPRAISALYEAR,PROP_CL&f=json&outSR=4326&returnGeometry=true"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            features = data.get('features', [])
            print(f"  Found {len(features)} matching parcel(s) in City of Dallas GIS!")
            if features:
                feat = features[0]
                attrs = feat.get('attributes', {})
                geom = feat.get('geometry', {})
                print(f"  -> DCAD ACCT: {attrs.get('ACCT')}")
                print(f"  -> Owner: {attrs.get('TAXPANAME1')}")
                print(f"  -> Address: {attrs.get('ST_NUM')} {attrs.get('ST_NAME')} {attrs.get('ST_TYPE')}")
                print(f"  -> Land Sqft: {attrs.get('AREA_FEET')}")
                print(f"  -> Prop Class: {attrs.get('PROP_CL')}")
    except Exception as e:
        print(f"  Error: {e}")

conn.close()

