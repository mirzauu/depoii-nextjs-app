import json
import re

with open('C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/frisco_permits_new_view_roofing.json', 'r', encoding='utf-8') as f:
    permits = json.load(f)

print(f"Total Frisco permits: {len(permits)}")

# Group by permit prefix
prefixes = {}
for p in permits:
    prefix = p['permitNumber'].split('-')[0]
    prefixes[prefix] = prefixes.get(prefix, 0) + 1

print("\nFrisco permit prefixes:")
for k, v in sorted(prefixes.items()):
    print(f"  {k}: {v}")

# Parent project prefixes
parent_prefixes = {}
for p in permits:
    pp = p.get('parentProject') or 'NONE'
    pp_pref = pp.split('-')[0] if '-' in pp else pp
    parent_prefixes[pp_pref] = parent_prefixes.get(pp_pref, 0) + 1

print("\nFrisco parent project prefixes:")
for k, v in sorted(parent_prefixes.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v}")

# Sample addresses
print("\nSample 15 addresses in Frisco:")
for p in permits[:15]:
    print(f"  {p['permitNumber']} | {p['address']} | {p.get('parentProject')} | {p['contractor']}")

