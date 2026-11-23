import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

test_addrs = [
    ('2845', 'LEE ST'),
    ('2832', 'SHORECREST DR'),
    ('9787', 'CLIFFORD DR'),
    ('2510', 'FLORENCE ST'),
    ('14900', 'LASATER RD'),
    ('2704', '2ND AVE'),
    ('14311', 'SKYFROST DR'),
    ('15950', 'DALLAS PKWY'),
    ('2901', 'BOTHAM JEAN BLVD'),
    ('4801', 'MONARCH ST'),
    ('2800', 'SOUTH BLVD'),
    ('1216', 'DOLTON DR'),
    ('4051', 'BUENA VISTA ST')
]

print("Testing ArcGIS queries with exact ST_NUM and ST_NAME:")
matched = 0
for num, st_name in test_addrs:
    where = f"ST_NUM='{num}' AND ST_NAME='{st_name}'"
    params = urllib.parse.urlencode({
        'where': where,
        'outFields': 'ACCT,ST_NUM,ST_NAME,TAXPANAME1,AREA_FEET',
        'f': 'json',
        'returnGeometry': 'false'
    })
    url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?{params}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            feats = data.get('features', [])
            if feats:
                matched += 1
                attr = feats[0]['attributes']
                print(f"MATCH: {num} {st_name} -> ACCT: {attr['ACCT']} | Owner: {attr['TAXPANAME1']}")
            else:
                print(f"NO MATCH: {num} {st_name}")
    except Exception as e:
        print(f"ERROR: {num} {st_name} -> {e}")

print(f"\nMatch rate: {matched}/{len(test_addrs)} ({matched/len(test_addrs)*100:.1f}%)")

