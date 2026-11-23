import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

test_queries = [
    "ST_NAME LIKE '%ASH%'",
    "ST_NAME LIKE '%TI BLVD%' OR ST_NAME LIKE '%TEXAS INSTRUMENTS%'",
    "ST_NAME LIKE '%DUNCANVILLE%'",
    "ST_NAME LIKE '%FAROLA%'",
    "ST_NAME LIKE '%REMOND%'",
    "ST_NUM = '8687'"
]

for q in test_queries:
    url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?where={urllib.parse.quote(q)}&outFields=ACCT,ST_NUM,ST_NAME,ST_TYPE,TAXPANAME1&f=pjson&returnGeometry=false&resultRecordCount=3"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            res = json.loads(resp.read().decode())
            feats = res.get('features', [])
            print(f"Query: {q} -> Found {len(feats)} features")
            for f in feats:
                print("  ", f.get('attributes'))
    except Exception as e:
        print(f"Query {q} failed: {e}")

