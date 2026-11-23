import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Check all variations of New View in the linked permits
cur.execute("""
    SELECT DISTINCT contractor_name, COUNT(*)
    FROM permits
    WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL
      AND (
        UPPER(contractor_name) LIKE '%NEW VIEW%'
        OR UPPER(contractor_name) LIKE '%NEWVIEW%'
        OR UPPER(contractor_name) LIKE '%MOB HOME%'
        OR UPPER(contractor_name) LIKE '%MICHAEL GIBSON%'
        OR UPPER(contractor_name) LIKE '%GIBSON%'
        OR UPPER(scope) LIKE '%NEW VIEW%'
        OR UPPER(scope) LIKE '%NEWVIEW%'
        OR UPPER(scope) LIKE '%MOB HOME%'
      )
    GROUP BY contractor_name
""")
rows = cur.fetchall()
print("Matches in 5,805 linked permits for any variation of New View / MOB / Gibson:")
total_m = 0
for r in rows:
    print(f"  Contractor: '{r[0]}' | Count: {r[1]}")
    total_m += r[1]

print(f"\nTotal matches: {total_m}")

# Let's inspect each matched permit details
cur.execute("""
    SELECT permit_no, city, address, contractor_name, kind, issued, parcel_ids
    FROM permits
    WHERE parcel_ids != '[]' AND parcel_ids IS NOT NULL
      AND (
        UPPER(contractor_name) LIKE '%NEW VIEW%'
        OR UPPER(contractor_name) LIKE '%NEWVIEW%'
        OR UPPER(contractor_name) LIKE '%MOB HOME%'
        OR UPPER(contractor_name) LIKE '%MICHAEL GIBSON%'
        OR UPPER(contractor_name) LIKE '%GIBSON%'
        OR UPPER(scope) LIKE '%NEW VIEW%'
        OR UPPER(scope) LIKE '%NEWVIEW%'
        OR UPPER(scope) LIKE '%MOB HOME%'
      )
    ORDER BY issued DESC
""")
all_details = cur.fetchall()
print("\nAll Matched Records:")
for p in all_details:
    print(f"  {p[0]} | {p[1]} | {p[2]} | {p[3]} | {p[4]} | {p[5]} | {p[6]}")

conn.close()

