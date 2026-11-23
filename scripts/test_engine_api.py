import urllib.request
import urllib.parse
import json

base_url = "http://localhost:3000/api/engine"

def test_api():
    # 1. Profile query for 'New View Roofing'
    url1 = f"{base_url}/contractors/profile?" + urllib.parse.urlencode({'name': 'New View Roofing'})
    print("Testing /contractors/profile?name=New View Roofing:")
    try:
        with urllib.request.urlopen(url1, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            c = data.get('contractor', {})
            print("  Name:", c.get('canonicalName'))
            print("  Permits:", c.get('permitCount'))
            print("  Valuation:", c.get('totalValuationFormatted'))
            print("  Phone:", c.get('phoneNumber'))
            print("  Website:", c.get('websiteUrl'))
            print("  HQ:", c.get('hqAddress'))
            print("  Certifications:", c.get('manufacturerCertifications'))
            print("  Leadership:", c.get('leadership'))
            print("  BBB:", c.get('bbbRating'), c.get('bbbProfileUrl'))
    except Exception as e:
        print("  Profile error (server may not be running on 3000):", e)

    # 2. Permits search query for 'New View Roofing'
    url2 = f"{base_url}/permits/search?" + urllib.parse.urlencode({'contractor': 'New View Roofing', 'limit': 5})
    print("\nTesting /permits/search?contractor=New View Roofing:")
    try:
        with urllib.request.urlopen(url2, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            print("  Total Permits Found:", data.get('total'))
            for p in data.get('permits', [])[:3]:
                print(f"   -> Permit {p.get('raw_permit_number') or p.get('permitNumber')} | {p.get('city')} | {p.get('normalized_address') or p.get('address')} | {p.get('issue_date') or p.get('issued')}")
    except Exception as e:
        print("  Permits error:", e)

test_api()
