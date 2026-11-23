import json

with open('C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/dallas_master_permits_2013_2026.json') as f:
    data = json.load(f)

types = {}
for p in data:
    pt = p.get('permitType', 'UNKNOWN')
    types[pt] = types.get(pt, 0) + 1

print("Dallas Master Permit Types:")
for k, v in types.items():
    print(f"  {k}: {v}")

commercial_keywords = ['COMMERCIAL', 'OFFICE', 'RETAIL', 'TPO', 'MULTI-FAMILY', 'APARTMENT', 'RESTAURANT', 'FLAT ROOF', 'EPDM', 'MODIFIED BITUMEN', 'COM-']

comm_list = []
for p in data:
    pnum = p.get('permitNumber', '')
    desc = p.get('description', '')
    pt = p.get('permitType', '')
    combined = f"{pnum} {desc} {pt}".upper()
    if any(kw in combined for kw in commercial_keywords):
        comm_list.append(p)

print(f"\nDallas Master Permits matching commercial criteria: {len(comm_list)}")
for p in comm_list:
    print(f"  {p['permitNumber']} | {p['address']} | {p['permitType']} | {p['description'][:80]}")

