import sqlite3

db = 'd:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db'
conn = sqlite3.connect(db)
cur = conn.cursor()

cur.execute("SELECT id, canonical_name, total_permits, total_valuation FROM canonical_contractors WHERE canonical_name LIKE '%New View%' OR canonical_name LIKE '%MOB%'")
rows = cur.fetchall()
print("Matches in canonical_contractors:", rows)

conn.close()
