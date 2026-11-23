import sqlite3
import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

# Check pure commercial properties (non-single family)
sql = """
SELECT pm.raw_permit_number, pm.city, pm.normalized_address, pm.category, pm.valuation, pm.raw_description, p.property_type, p.owner_name
FROM warehouse.normalized_permits pm
LEFT JOIN warehouse.parcels p ON (
    (pm.parcel_id IS NOT NULL AND pm.parcel_id <> '' AND (p.id = pm.parcel_id OR p.account_number = pm.parcel_id))
    OR (LOWER(TRIM(p.address)) = LOWER(TRIM(pm.normalized_address)) AND LOWER(p.city) = LOWER(pm.city))
)
WHERE (LOWER(pm.contractor_name) = LOWER('New View Roofing') OR pm.contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA')
  AND (
    LOWER(pm.raw_description) LIKE '%tpo%'
    OR LOWER(pm.raw_description) LIKE '%modified bitumen%'
    OR LOWER(pm.raw_description) LIKE '%restaurant%'
    OR LOWER(COALESCE(p.property_type, '')) LIKE '%commercial%'
    OR LOWER(COALESCE(p.property_type, '')) LIKE '%office%'
    OR LOWER(pm.normalized_address) LIKE '%central expy%'
    OR LOWER(pm.normalized_address) LIKE '%macarthur%'
    OR LOWER(pm.normalized_address) LIKE '%dickerson%'
    OR LOWER(pm.normalized_address) LIKE '%henderson%'
    OR LOWER(pm.normalized_address) LIKE '%lee st%'
  )
ORDER BY pm.issue_date DESC NULLS LAST;
"""

cur.execute(sql)
rows = cur.fetchall()
print(f"Total True Commercial Properties found: {len(rows)}")
for r in rows:
    print(r)

conn.close()

