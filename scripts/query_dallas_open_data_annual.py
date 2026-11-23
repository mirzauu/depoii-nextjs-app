import urllib.request
import json

years = [
    ('2014', '14'),
    ('2015', '15'),
    ('2016', '16'),
    ('2017', '17'),
    ('2018', '18'),
    ('2019', '19'),
    ('2020', '20'),
    ('2021', '21'),
    ('2022', '22'),
    ('2023', '23'),
    ('2024', '24')
]

results = []

for y_full, y_short in years:
    tot_url = f"https://www.dallasopendata.com/resource/e7gq-4sah.json?$select=count(*)&$where=issued_date%20like%20'%25{y_short}'"
    roof_url = f"https://www.dallasopendata.com/resource/e7gq-4sah.json?$select=count(*)&$where=issued_date%20like%20'%25{y_short}'%20and%20(upper(work_description)%20like%20'%25ROOF%25'%20or%20upper(permit_type)%20like%20'%25ROOF%25')"
    
    try:
        req_tot = urllib.request.Request(tot_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_tot, timeout=10) as r:
            tot_data = json.loads(r.read())
            tot_count = int(tot_data[0]['count'])
            
        req_roof = urllib.request.Request(roof_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_roof, timeout=10) as r:
            roof_data = json.loads(r.read())
            roof_count = int(roof_data[0]['count'])
            
        results.append((y_full, tot_count, roof_count))
        print(f"{y_full}: Total All Permits = {tot_count:,} | Roofing Permits = {roof_count:,}")
    except Exception as e:
        print(f"{y_full}: Error {e}")
        results.append((y_full, 0, 0))

print("\nFinal Array:")
print(results)

