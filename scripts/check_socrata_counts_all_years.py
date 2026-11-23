import urllib.request
import urllib.parse
import json

base_url = "https://www.dallasopendata.com/resource/e7gq-4sah.json"
years = ['23', '22', '21', '20', '19', '18']

print("Checking exact roofing permit counts in Socrata for Dallas:")
for yr in years:
    where = f"issued_date like '%{yr}' and (upper(work_description) like '%ROOF%' or upper(permit_type) like '%ROOF%')"
    params = {"$select": "count(*)", "$where": where}
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            cnt = data[0]['count']
            print(f"  20{yr}: {int(cnt):,} permits")
    except Exception as e:
        print(f"  20{yr}: Error - {e}")

