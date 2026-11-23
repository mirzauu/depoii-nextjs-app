import sqlite3
import urllib.parse
import urllib.request
import json
import ssl
from datetime import datetime, UTC

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 4351 Dallas-Ft Worth Tpke is Interstate 30 / Tom Landry Fwy / W Commerce
# 2310 LBJ Fwy is Interstate 635
# 3011 Dallas Ft Worth Tpke is 3011 W Commerce St / I-30
# 6318 Richmond Ave
# 1575 E Kiest Blvd

addresses_to_resolve = [
    ('4351 DALLAS-FT WORTH TPKE, Dallas, TX', '4351 TOM LANDRY FWY'),
    ('4351 DALLAS-FT WORTH TPKE, Dallas, TX', '4351 W COMMERCE ST'),
    ('2310 LBJ FWY, #100, Dallas, TX', '2310 STEMMONS FWY'),
    ('2310 LBJ FWY, #100, Dallas, TX', '2310 LYNDON B JOHNSON FWY'),
    ('3011 DALLAS FT WORTH TPKE, Dallas, TX 75212', '3011 TOM LANDRY FWY'),
    ('3011 DALLAS FT WORTH TPKE, Dallas, TX 75212', '3011 W COMMERCE ST'),
    ('6318 RICHMOND AVE, Dallas, TX 75214', '6318 RICHMOND AVE'),
    ('1575 E KIEST BLVD, Dallas, TX 75216', '1575 E KIEST BLVD')
]

resolved_final = {}

for orig_addr, alt_addr in addresses_to_resolve:
    if orig_addr in resolved_final:
        continue
    query_addr = f"{alt_addr}, Dallas, TX"
    url = 'https://gis.dallascityhall.com/arcgis/rest/services/Pbw_public/ROWMSDallasStreetsLocator/GeocodeServer/findAddressCandidates?' + urllib.parse.urlencode({
        'SingleLine': query_addr,
        'f': 'json',
        'outSR': '4326',
        'maxLocations': 1
    })
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            cands = data.get('candidates', [])
            if cands:
                lng = cands[0]['location']['x']
                lat = cands[0]['location']['y']
                
                # Query parcel
                buf = 0.0003
                env = f"{lng - buf},{lat - buf},{lng + buf},{lat + buf}"
                purl = 'https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?' + urllib.parse.urlencode({
                    'geometry': env,
                    'geometryType': 'esriGeometryEnvelope',
                    'spatialRel': 'esriSpatialRelIntersects',
                    'inSR': '4326',
                    'outSR': '4326',
                    'outFields': 'ACCT,GIS_ACCT,ST_NUM,ST_NAME,ST_TYPE,TAXPANAME1,TAXPAADD1,AREA_FEET',
                    'f': 'json'
                })
                req2 = urllib.request.Request(purl, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req2, context=ctx, timeout=5) as r2:
                    pdata = json.loads(r2.read().decode())
                    feats = pdata.get('features', [])
                    if feats:
                        attr = feats[0]['attributes']
                        acct = attr.get('ACCT')
                        if not acct or acct == 'MULTIPLE':
                            acct = attr.get('GIS_ACCT')
                        if acct and acct != 'MULTIPLE':
                            print(f"SUCCESS: '{orig_addr}' matched via '{alt_addr}' -> ACCT: {acct} | Owner: {attr.get('TAXPANAME1')}")
                            resolved_final[orig_addr] = {
                                'account': f"DCAD:{acct}",
                                'owner': attr.get('TAXPANAME1') or 'COMMERCIAL PROPERTY OWNER',
                                'address': f"{attr.get('ST_NUM')} {attr.get('ST_NAME')} {attr.get('ST_TYPE')}".strip(),
                                'sqft': int(float(attr.get('AREA_FEET') or 0)),
                                'lat': lat,
                                'lng': lng,
                                'owner_address': attr.get('TAXPAADD1') or '',
                                'record_url': f"https://www.dallascad.org/AcctDetailCom.aspx?ID={acct}"
                            }
    except Exception as e:
        print(f"Error for {alt_addr}: {e}")

# Apply to DB
if resolved_final:
    conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
    cur = conn.cursor()
    now_iso = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    
    for o_addr, pdata in resolved_final.items():
        cur.execute("SELECT account FROM parcels WHERE account = ?", (pdata['account'],))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO parcels (account, owner, address, city, year_built, sqft, lat, lng, owner_address, record_url, updated_at)
                VALUES (?, ?, ?, 'Dallas', 0, ?, ?, ?, ?, ?, ?)
            """, (pdata['account'], pdata['owner'], pdata['address'], pdata['sqft'], pdata['lat'], pdata['lng'], pdata['owner_address'], pdata['record_url'], now_iso))
        
        cur.execute("""
            UPDATE permits
            SET parcel_ids = ?, lat = ?, lng = ?, updated_at = ?
            WHERE address = ? 
              AND (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
              AND (parcel_ids = '[]' OR parcel_ids IS NULL)
        """, (json.dumps([pdata['account']]), pdata['lat'], pdata['lng'], now_iso, o_addr))
    
    conn.commit()
    
    cur.execute("""
        SELECT count(*)
        FROM permits
        WHERE (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
          AND (parcel_ids = '[]' OR parcel_ids IS NULL)
    """)
    print("FINAL REMAINING UNMATCHED COMMERCIAL PERMITS:", cur.fetchone()[0])
    conn.close()

