import sqlite3
import json

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()
cur.execute("SELECT permit_no FROM permits")
existing = set(r[0] for r in cur.fetchall())

with open('C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/dallas_historical_permits_2013_2024.json', 'r', encoding='utf-8') as f:
    hist = json.load(f)

new_permits = [p for p in hist if p.get('permitNumber') not in existing]
print(f"Found {len(new_permits)} new historical Dallas permits:")
for p in new_permits:
    print(f"  {p.get('permitNumber')} | {p.get('issueDate')} | {p.get('address')} | {p.get('contractor')} | {p.get('valuation')}")

conn.close()

