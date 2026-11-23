import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_query(num, name):
    for q in [
        f"ST_NUM='{num}' AND (ST_NAME LIKE '%{name}%' OR ST_NAME LIKE '{name}%')",
        f"ST_NUM='{num}'",
        f"ST_NAME LIKE '%{name}%'"
    ]:
        params = urllib.parse.urlencode({
            'where': q,
            'outFields': 'ACCT,ST_NUM,ST_DIR,ST_NAME,ST_TYPE,TAXPANAME1',
            'f': 'json',
            'resultRecordCount': 3
        })
        url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?{params}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            feats = data.get('features', [])
            print(f"  Where: {q} -> {len(feats)} results")
            for f in feats:
                print("    ", f['attributes'])
        if feats and "ST_NUM" in q:
            break

print("SHORECREST:")
test_query('2832', 'SHORECREST')

print("\nCLIFFORD:")
test_query('9787', 'CLIFFORD')

print("\nFLORENCE:")
test_query('2510', 'FLORENCE')

print("\n2ND AVE:")
test_query('2704', '2ND')

print("\nDOLTON:")
test_query('1216', 'DOLTON')

