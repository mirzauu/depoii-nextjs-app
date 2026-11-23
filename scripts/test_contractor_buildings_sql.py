import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

# Query distinct buildings associated with New View Roofing
sql = """
WITH raw_matches AS (
    SELECT 
        COALESCE(p.id, p.account_number, pm.parcel_id) as parcel_id,
        COALESCE(p.address, pm.normalized_address) as address,
        COALESCE(p.city, pm.city) as city,
        p.owner_name,
        COALESCE(p.building_sqft, p.land_sqft, 0) as sqft,
        p.year_built,
        p.property_type,
        COALESCE(p.latitude, pm.latitude) as lat,
        COALESCE(p.longitude, pm.longitude) as lng,
        COUNT(pm.id) as permit_count,
        MAX(pm.issue_date) as latest_permit_date,
        SUM(COALESCE(pm.valuation, 0)) as total_permit_valuation,
        MAX(pm.category) as primary_work_type
    FROM warehouse.normalized_permits pm
    LEFT JOIN warehouse.parcels p ON (
        (pm.parcel_id IS NOT NULL AND pm.parcel_id <> '' AND (p.id = pm.parcel_id OR p.account_number = pm.parcel_id))
        OR (LOWER(TRIM(p.address)) = LOWER(TRIM(pm.normalized_address)) AND LOWER(p.city) = LOWER(pm.city))
    )
    WHERE LOWER(pm.contractor_name) = LOWER('New View Roofing')
       OR pm.contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'
    GROUP BY 
        COALESCE(p.id, p.account_number, pm.parcel_id),
        COALESCE(p.address, pm.normalized_address),
        COALESCE(p.city, pm.city),
        p.owner_name,
        COALESCE(p.building_sqft, p.land_sqft, 0),
        p.year_built,
        p.property_type,
        COALESCE(p.latitude, pm.latitude),
        COALESCE(p.longitude, pm.longitude)
)
SELECT * FROM raw_matches ORDER BY latest_permit_date DESC NULLS LAST LIMIT 10;
"""

cur.execute(sql)
rows = cur.fetchall()
print(f"Sample 10 buildings returned: {len(rows)}")
for r in rows:
    print(r)

cur.execute("""
    SELECT COUNT(DISTINCT COALESCE(p.id, p.account_number, pm.normalized_address))
    FROM warehouse.normalized_permits pm
    LEFT JOIN warehouse.parcels p ON (
        (pm.parcel_id IS NOT NULL AND pm.parcel_id <> '' AND (p.id = pm.parcel_id OR p.account_number = pm.parcel_id))
        OR (LOWER(TRIM(p.address)) = LOWER(TRIM(pm.normalized_address)) AND LOWER(p.city) = LOWER(pm.city))
    )
    WHERE LOWER(pm.contractor_name) = LOWER('New View Roofing')
       OR pm.contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'
""")
total_buildings = cur.fetchone()[0]
print(f"\nTOTAL DISTINCT BUILDINGS UNDER NEW VIEW ROOFING: {total_buildings}")

conn.close()

