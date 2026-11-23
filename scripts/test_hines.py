import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

where = "ST_NUM LIKE '630%' AND (ST_NAME LIKE 'HARRY HINES%' OR ST_NAME LIKE '%HINES%')"
url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?where={urllib.parse.quote(where)}&outFields=ACCT,GIS_ACCT,ST_NUM,ST_NAME,ST_TYPE,TAXPANAME1&f=pjson&returnGeometry=false"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as resp:
    res = json.loads(resp.read().decode())
    print(f"Count: {len(res.get('features', []))}")
    for f in res.get('features', []):
        print(f.get('attributes'))

