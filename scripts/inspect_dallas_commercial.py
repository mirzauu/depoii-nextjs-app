import json

with open('C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/dallas_permits_new_view_roofing.json', 'r', encoding='utf-8') as f:
    dallas = json.load(f)

print(f"Total Dallas permits: {len(dallas)}")

by_type = {}
by_use = {}
commercial_permits = []

for p in dallas:
    ptype = p.get('type') or p.get('kind') or 'Unknown'
    by_type[ptype] = by_type.get(ptype, 0) + 1
    
    # check if commercial
    use = p.get('land_use') or p.get('proposed_use') or p.get('use') or ''
    desc = p.get('description') or p.get('scope') or ''
    addr = p.get('address') or ''
    pnum = p.get('permit_number') or p.get('permit_no') or ''
    
    is_comm = False
    if 'COM' in str(pnum) or 'COMMERCIAL' in str(ptype).upper() or 'COMMERCIAL' in str(use).upper() or 'COMMERCIAL' in str(desc).upper():
        is_comm = True
    elif any(term in str(use).upper() for term in ['OFFICE', 'RETAIL', 'RESTAURANT', 'MULTI-FAMILY', 'APARTMENT', 'CHURCH', 'HOTEL']):
        is_comm = True
    elif any(term in str(desc).upper() for term in ['COMMERCIAL', 'OFFICE', 'RETAIL', 'APARTMENT', 'MULTI-FAMILY', 'TPO', 'EPDM', 'MOD BIT']):
        is_comm = True
        
    if is_comm or ptype == 'Commercial':
        commercial_permits.append(p)

print(f"\nDallas permit breakdown by type:")
for k, v in by_type.items():
    print(f"  {k}: {v}")

print(f"\nDallas Commercial / Multi-Family Permits Identified: {len(commercial_permits)}")
for p in commercial_permits:
    pnum = p.get('permit_number') or p.get('permit_no')
    addr = p.get('address')
    desc = p.get('description') or p.get('scope') or ''
    val = p.get('valuation')
    print(f"  Permit: {pnum} | {addr} | Val: ${val} | Scope: {desc[:80]}")

