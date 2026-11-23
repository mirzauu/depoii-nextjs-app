import urllib.request
import json

url = "https://www.dallasopendata.com/resource/e7gq-4sah.json?$where=issued_date%20like%20'%2524'%20and%20(upper(work_description)%20like%20'%25ROOF%25'%20or%20upper(permit_type)%20like%20'%25ROOF%25')&$limit=5"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.loads(resp.read().decode('utf-8'))

print("Sample 5 records:")
for i, d in enumerate(data):
    print(f"\nRecord {i+1}:")
    for k, v in d.items():
        print(f"  {k}: {v}")

