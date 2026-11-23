import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def search(where, fields='ACCT,ST_NUM,ST_DIR,ST_NAME,ST_TYPE,TAXPANAME1,PROPNAM,BUSNAME,LEGAL_1'):
    params = urllib.parse.urlencode({
        'where': where,
        'outFields': fields,
        'f': 'json',
        'returnGeometry': 'false',
        'resultRecordCount': 5
    })
    url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?{params}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        return json.loads(resp.read().decode()).get('features', [])

print("TI BLVD matches:")
for f in search("ST_NAME LIKE '%TI BLVD%'"):
    print(f['attributes'])

print("\nREMOND matches:")
for f in search("ST_NAME LIKE '%REMOND%'"):
    print(f['attributes'])

print("\nFAROLA matches:")
for f in search("ST_NAME LIKE '%FAROLA%'"):
    print(f['attributes'])

print("\nASH LN matches:")
for f in search("ST_NAME LIKE '%ASH LN%'"):
    print(f['attributes'])

