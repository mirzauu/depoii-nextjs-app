import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Update Frisco permits membrane so it doesn't say TPO unless commercial
cur.execute("""
    UPDATE permits 
    SET membrane = 'Architectural Shingle' 
    WHERE city = 'Frisco' AND kind = 'Residential Roofing'
""")
conn.commit()

# Now re-run query for exact commercial vs residential breakdown
cur.execute("""
    SELECT 
        city,
        CASE 
            WHEN kind LIKE '%Commercial%' OR permit_no LIKE 'COM-%' OR scope LIKE '%TPO%' THEN 'Commercial'
            ELSE 'Residential'
        END as category,
        COUNT(*)
    FROM permits
    WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'
    GROUP BY city, category
""")

print("--- Exact Commercial vs Residential Breakdown for New View Roofing ---")
total_comm = 0
total_res = 0
for r in cur.fetchall():
    city, cat, cnt = r
    print(f"  {city} | {cat}: {cnt}")
    if cat == 'Commercial':
        total_comm += cnt
    else:
        total_res += cnt

print(f"\nTOTAL COMMERCIAL: {total_comm}")
print(f"TOTAL RESIDENTIAL: {total_res}")
print(f"GRAND TOTAL: {total_comm + total_res}")

conn.close()

