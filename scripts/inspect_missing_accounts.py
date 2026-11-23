import sqlite3
import json

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

cur.execute("""
    SELECT permit_no, address, parcel_ids 
    FROM permits 
    WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL
""")
rows = cur.fetchall()

missing_accounts = {}
for pno, addr, pids_str in rows:
    pids = json.loads(pids_str)
    for acc in pids:
        cur.execute("SELECT 1 FROM parcels WHERE account = ?", (acc,))
        if not cur.fetchone():
            missing_accounts[acc] = missing_accounts.get(acc, 0) + 1

print(f"Missing accounts count: {len(missing_accounts)}")
for acc, cnt in list(missing_accounts.items())[:10]:
    print(f"  {acc}: {cnt} permits")

conn.close()

