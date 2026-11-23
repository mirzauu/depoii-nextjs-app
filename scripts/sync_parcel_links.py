import sqlite3
import json

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

updates = [
    ('COM-ROOF-25-000170', '["DCAD:00000192364000000"]'),
    ('2502201148_198481083-002', '["DCAD:00000156697000000"]'),
    ('2502151003_198481083-001', '["DCAD:00000156697000000"]'),
    ('2108301032_167301306-003', '["DCAD:00000125920000000"]'),
    ('2108301031_167301306-002', '["DCAD:00000125920000000"]'),
    ('2108151008_167301306-001', '["DCAD:00000125920000000"]'),
    ('1910111195', '["DCAD:00000125920000000"]'),
    ('1909231065', '["DCAD:00000125920000000"]'),
    ('2008211136', '["DCAD:00000804016000000"]'),
    ('2003111057', '["DCAD:00000251053000000"]'),
    ('1906181119', '["DCAD:00000251053000000"]'),
    ('1905311008', '["DCAD:00000251053000000"]'),
    ('1804231171', '["DCAD:COL-000000220433"]'),
    ('2024-05-3882', '["DCAD:320864600A0020000"]')
]

for pno, pids in updates:
    cur.execute("UPDATE permits SET parcel_ids = ? WHERE permit_no = ?", (pids, pno))

conn.commit()

cur.execute("""
    SELECT COUNT(*) FROM permits 
    WHERE (contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%')
      AND parcel_ids != '[]'
""")
print("New View permits with linked parcels:", cur.fetchone()[0])

conn.close()

