import urllib.request
import urllib.parse
import json
import sys

datasets = [
    ("e7gq-4sah", "Master Building Permits Archive (2015-2021)"),
    ("fs84-rv8z", "Building Permits FY 2013-2014"),
    ("rzm4-tcqx", "Building Permits FY 2015-2016")
]

terms = ["SR1", "SR-1", "RODDEN"]

all_found = []

for ds_id, ds_name in datasets:
    print(f"\nQuerying {ds_name} ({ds_id})...", flush=True)
    for term in terms:
        clauses = [
            f"contains(contractor, '{term.upper()}')",
            f"contains(contractor, '{term.title()}')",
            f"contains(work_description, '{term.upper()}')"
        ]
        filter_expr = " or ".join(clauses)
        encoded_filter = urllib.parse.quote(filter_expr)
        url = f"https://www.dallasopendata.com/api/odata/v4/{ds_id}?$filter={encoded_filter}"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode())
                vals = data.get("value", [])
                if vals:
                    print(f"  [FOUND] Term '{term}': {len(vals)} records", flush=True)
                    for item in vals:
                        item["_source_dataset"] = ds_id
                        item["_matched_term"] = term
                        all_found.append(item)
                else:
                    print(f"  [0] Term '{term}'", flush=True)
        except Exception as e:
            print(f"  Error on {term}: {e}", flush=True)

print(f"\nTotal historical records found across Socrata: {len(all_found)}", flush=True)
with open("data/socrata_sr1_permits_raw.json", "w", encoding="utf-8") as f:
    json.dump(all_found, f, indent=2)
print("Saved to data/socrata_sr1_permits_raw.json", flush=True)
