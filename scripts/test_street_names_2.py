import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for st in ['SECOND', 'FLORENCE', 'SHORECREST', 'DOLTON']:
    params = urllib.parse.urlencode({
        'where': f"ST_NAME LIKE '%{st}%'",
        'outFields': 'ACCT,ST_NUM,ST_DIR,ST_NAME,ST_TYPE,TAXPANAME1',
        'f': 'json',
        'resultRecordCount': 3
    })
    url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?{params}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as resp:
        data = json.loads(resp.read().decode())
        feats = data.get('features', [])
        print(f"Street search '{st}' -> {len(feats)} results")
        for f in feats:
            print("  ", f['attributes'])

