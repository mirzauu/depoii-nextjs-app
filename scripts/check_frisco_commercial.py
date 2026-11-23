import json
import re

with open('C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/frisco_permits_new_view_roofing.json', 'r', encoding='utf-8') as f:
    permits = json.load(f)

# Common commercial street suffixes vs residential
# Let's inspect major thoroughfares in Frisco
commercial_thoroughfares = [
    'PRESTON', 'DALLAS PKWY', 'TOLLWAY', 'MAIN ST', 'ELDORADO', 'STONEBROOK',
    'LEBANON', 'WARREN', 'FRISCO SQUARE', 'PARKWOOD', 'LEGACY', 'OHIO', 'ROLLINGBROOK'
]

potential_commercial = []
residential_count = 0

for p in permits:
    addr = p['address'].upper()
    pnum = p['permitNumber']
    is_comm = False
    
    # Check if address contains major commercial street
    for th in commercial_thoroughfares:
        if th in addr:
            is_comm = True
            break
            
    # Check if permit number has COM or C prefix or F (commercial finish out?)
    if pnum.startswith('C') or 'COM' in pnum:
        is_comm = True
        
    if is_comm:
        potential_commercial.append(p)
    else:
        residential_count += 1

print(f"Total Frisco permits: {len(permits)}")
print(f"Potential commercial in Frisco: {len(potential_commercial)}")
print(f"Evidently residential in Frisco: {residential_count}")

print("\nList of potential commercial permits in Frisco:")
for p in potential_commercial:
    print(f"  {p['permitNumber']} | {p['address']} | {p.get('parentProject')} | {p['contractor']}")

