import urllib.parse
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?" + urllib.parse.urlencode({
    'where': "ST_NAME LIKE 'DOLTON%'",
    'outFields': 'ACCT,ST_NUM,ST_NAME,TAXPANAME1,AREA_FEET',
    'f': 'json'
})
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as resp:
    data = json.loads(resp.read().decode())
    print("All DOLTON parcels:")
    for f in data.get('features', []):
        print(f['attributes'])

