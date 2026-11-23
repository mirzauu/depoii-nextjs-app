import sqlite3
import shutil

source_db = 'd:/Depoii_nextjs/data/depoii.sqlite'
targets = [
    'd:/Depoii_nextjs/landing-sites/depoii-landing-build/data/depoii.sqlite',
    'd:/Depoii_nextjs/.next/standalone/data/depoii.sqlite'
]

# Ensure contractor_name consistency across all permits in depoii.sqlite
conn = sqlite3.connect(source_db)
cur = conn.cursor()
cur.execute("""
    UPDATE permits 
    SET contractor_name = 'New View Roofing' 
    WHERE UPPER(contractor_name) LIKE '%NEW VIEW%'
""")
updated = cur.rowcount
conn.commit()
print(f"Standardized {updated} permits under contractor_name = 'New View Roofing' in depoii.sqlite")

cur.execute("SELECT count(*) FROM permits WHERE contractor_name = 'New View Roofing'")
print(f"Total New View Roofing permits in local DB: {cur.fetchone()[0]}")
conn.close()

for t in targets:
    try:
        shutil.copy2(source_db, t)
        print(f"Synced to {t}")
    except Exception as e:
        print(f"Error copying to {t}: {e}")
