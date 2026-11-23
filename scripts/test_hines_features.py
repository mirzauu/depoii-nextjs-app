import urllib.request
import urllib.parse
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 6300 HARRY HINES BLVD
# Let's inspect features returned at 2475990.7, 6985713.5
x, y = 2475990.7, 6985713.5
env = f"{x-10},{y-10},{x+10},{y+10}"
parc_params = urllib.parse.urlencode({
    'geometry': env,
    'geometryType': 'esriGeometryEnvelope',
    'spatialRel': 'esriSpatialRelIntersects',
    'inSR': '2276',
    'outFields': '*',
    'f': 'json',
    'resultRecordCount': 5
})
parc_url = f"https://gis.dallascityhall.com/arcgis/rest/services/Basemap/DallasTaxParcels/MapServer/0/query?{parc_params}"
req = urllib.request.Request(parc_url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as resp:
    pdata = json.loads(resp.read().decode())
    print("Features for 6300 Harry Hines:")
    for f in pdata.get('features', []):
        print(f['attributes'])

