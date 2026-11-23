import sqlite3
import json
import glob
import os

artifact_dir = 'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f'
json_files = glob.glob(os.path.join(artifact_dir, '*.json'))
print("Artifact JSON files:", [os.path.basename(f) for f in json_files])

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("SELECT permit_no FROM permits WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'")
existing_permits = set(r[0] for r in cur.fetchall())
print(f"Existing New View permits in depoii.sqlite: {len(existing_permits)}")

for jf in json_files:
    fname = os.path.basename(jf)
    try:
        with open(jf, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
            # find permit numbers
            pnums = set()
            for item in data:
                pn = item.get('permitNumber') or item.get('permit_number') or item.get('permit_no') or item.get('PERMIT_NUMBER')
                if pn:
                    pnums.add(pn)
            new_pnums = pnums - existing_permits
            print(f"  {fname}: {len(pnums)} total permits in file, {len(new_pnums)} new not in DB")
    except Exception as e:
        print(f"  {fname}: Error - {e}")

conn.close()

