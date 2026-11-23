import urllib.request
import urllib.parse
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Test addresses that didn't match simple text query
test_addrs = [
    '2832 SHORECREST DR, Dallas, TX',
    '9787 CLIFFORD DR, Dallas, TX',
    '2510 FLORENCE ST, Dallas, TX',
    '2704 2ND AVE, Dallas, TX',
    '1216 DOLTON DR, Dallas, TX',
    '6300 HARRY HINES BLVD, Dallas, TX',
    '12500 TI BLVD, Dallas, TX',
    '3430 DUNCANVILLE RD, Dallas, TX'
]

print("Testing Geocode -> Spatial Intersect Pipeline:")
print("=" * 80)

for addr in test_addrs:
    # 1. Geocode via ROWMS Dallas Streets Locator
    geo_url = 'https://gis.dallascityhall.com/arcgis/rest/services/Pbw_public/ROWMSDallasStreetsLocator/GeocodeServer/findAddressCandidates?' + urllib.parse.urlencode({'SingleLine': addr, 'f': 'json'})
    req = urllib.request.Request(geo_url, headers={'User-Agent': 'Mozilla/5.0'})
    x, y = None, None
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            cands = data.get('candidates', [])
            if cands:
                loc = cands[0]['location']
                x, y = loc['x'], loc['y']
                print(f"\n{addr}: Geocoded -> ({x:.1f}, {y:.1f}) [Score: {cands[0].get('score')}]")
            else:
                print(f"\n{addr}: Geocode FAILED")
                continue
    except Exception as e:
        print(f"\n{addr}: Geocode Error {e}")
        continue

    # 2. Query DallasTaxParcels by point buffer or point intersection
    # Use a small buffer envelope around the point (e.g. 50 feet)
    env = f"{x-30},{y-30},{x+30},{y+30}"
    parc_params = urllib.parse.urlencode({
        'geometry': env,
        'geometryType': 'esriGeometryEnvelope',
        'spatialRel': 'esriSpatialRelIntersects',
        'inSR': '2276',
        'outFields': 'ACCT,ST_NUM,ST_NAME,TAXPANAME1,AREA_FEET,PROP_CL',
        'f': 'json',
        'resultRecordCount': 3
    })
    parc_url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?{parc_params}"
    req2 = urllib.request.Request(parc_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req2, context=ctx, timeout=8) as resp2:
            pdata = json.loads(resp2.read().decode())
            feats = pdata.get('features', [])
            if feats:
                feat = feats[0]['attributes']
                print(f"  -> MATCHED PARCEL: ACCT={feat.get('ACCT')} | Addr={feat.get('ST_NUM')} {feat.get('ST_NAME')} | Owner={feat.get('TAXPANAME1')} | Area={feat.get('AREA_FEET')}")
            else:
                print("  -> No intersecting parcel found at coordinates")
    except Exception as e:
        print(f"  -> Parcel query error: {e}")

