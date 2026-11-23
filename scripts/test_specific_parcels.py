import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def query_parcels(where):
    params = urllib.parse.urlencode({
        'where': where,
        'outFields': 'ACCT,ST_NUM,ST_DIR,ST_NAME,ST_TYPE,TAXPANAME1,CITY,AREA_FEET',
        'f': 'json',
        'returnGeometry': 'false',
        'resultRecordCount': 5
    })
    url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?{params}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return data.get('features', [])
    except Exception as e:
        print(f"Error querying {where}: {e}")
        return []

tests = [
    "ST_NUM='2100' AND ST_NAME LIKE 'FAROLA%'",
    "ST_NUM='3430' AND ST_NAME LIKE 'DUNCANVILLE%'",
    "ST_NUM='2700' AND ST_NAME LIKE 'REMOND%'",
    "ST_NUM='3501' AND ST_NAME LIKE 'ASH%'",
    "ST_NUM='12500' AND ST_NAME LIKE 'TI%'"
]

for t in tests:
    res = query_parcels(t)
    print(f"\nQuery: {t} -> {len(res)} matches")
    for r in res:
        print("  ", r.get('attributes'))
