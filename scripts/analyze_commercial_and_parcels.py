import sqlite3
import json
import re

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# 1. Check all permits in DB by kind
cur.execute("SELECT kind, COUNT(*) FROM permits GROUP BY kind ORDER BY COUNT(*) DESC")
print("--- All Permits by Kind in DB ---")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

# 2. Check New View Roofing permits in DB by kind
cur.execute("""
    SELECT city, kind, COUNT(*) 
    FROM permits 
    WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%' 
    GROUP BY city, kind
""")
print("\n--- New View Roofing Permits by City and Kind ---")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]}: {r[2]}")

# 3. Check existing parcel matches for New View Roofing
cur.execute("""
    SELECT permit_no, kind, address, city, parcel_ids, scope
    FROM permits 
    WHERE (contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%')
      AND parcel_ids != '[]' AND parcel_ids IS NOT NULL
""")
matched_permits = cur.fetchall()
print(f"\n--- New View Roofing Permits Already Matched to Parcels: {len(matched_permits)} ---")
for p in matched_permits:
    print(f"  Permit: {p[0]} | {p[1]} | {p[2]} | Parcels: {p[4]}")

# 4. Check parcels table for Frisco
cur.execute("SELECT COUNT(*) FROM parcels WHERE city LIKE '%Frisco%'")
frisco_parcels = cur.fetchone()[0]
print(f"\nTotal Frisco parcels in parcels table: {frisco_parcels}")

conn.close()

