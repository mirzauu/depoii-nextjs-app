import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Let's inspect fields of DallasTaxParcels
url = "https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0?f=pjson"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as resp:
    data = json.loads(resp.read().decode())
    fields = [f['name'] for f in data.get('fields', [])]
    print("Fields in DallasTaxParcels layer 0:")
    print(fields)

# Let's test a search for 'HARRY HINES' or 'ASH'
where = "ST_NAME LIKE 'HARRY HINES%' AND ST_NUM LIKE '63%'"
url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?where={urllib.parse.quote(where)}&outFields=ACCT,GIS_ACCT,ST_NUM,ST_NAME,ST_TYPE,TAXPANAME1&f=pjson&returnGeometry=false"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as resp:
    res = json.loads(resp.read().decode())
    print("\nSearch for HARRY HINES 63%:")
    for f in res.get('features', [])[:5]:
        print(f.get('attributes'))

