import urllib.request
import urllib.parse
import json

# Test warehouse directly via python function call
import sys
sys.path.append('d:/Depoii_nextjs/src/lib')
# We can test via the test script we ran earlier:
import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

# Test the query that warehouse.contractorBuildings executes
sql = """
with base_permits as (
    select pm.id as permit_id,
           pm.raw_permit_number,
           pm.parcel_id,
           pm.normalized_address,
           pm.city,
           pm.state,
           pm.issue_date,
           pm.valuation,
           pm.category,
           pm.probable_roof_system,
           pm.latitude,
           pm.longitude
    from warehouse.normalized_permits pm
    where lower(pm.contractor_name) = lower('New View Roofing')
       or lower(pm.contractor_name) = lower('New View Roofing')
       or pm.contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'
),
building_matches as (
    select 
      coalesce(p.id, p.account_number, bp.parcel_id, 'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city)))) as building_id,
      coalesce(p.account_number, bp.parcel_id, '') as parcel_account,
      coalesce(p.address, bp.normalized_address) as address,
      coalesce(p.city, bp.city) as city,
      coalesce(p.state, bp.state, 'TX') as state,
      p.owner_name,
      p.owner_address,
      coalesce(p.building_sqft, p.land_sqft, 0) as sqft,
      p.year_built,
      p.property_type,
      coalesce(p.latitude, bp.latitude) as latitude,
      coalesce(p.longitude, bp.longitude) as longitude,
      count(bp.permit_id) as permit_count,
      sum(coalesce(bp.valuation, 0)) as total_valuation,
      max(bp.issue_date) as latest_permit_date,
      (array_agg(bp.category order by bp.issue_date desc nulls last))[1] as primary_work_type,
      (array_agg(bp.probable_roof_system order by bp.issue_date desc nulls last))[1] as roof_system,
      array_agg(bp.raw_permit_number) as permit_numbers
    from base_permits bp
    left join warehouse.parcels p on (
      (bp.parcel_id is not null and bp.parcel_id <> '' and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
      or (lower(trim(p.address)) = lower(trim(bp.normalized_address)) and lower(p.city) = lower(bp.city))
    )
    group by 
      coalesce(p.id, p.account_number, bp.parcel_id, 'BLDG-' || md5(lower(trim(bp.normalized_address)) || '-' || lower(trim(bp.city)))),
      coalesce(p.account_number, bp.parcel_id, ''),
      coalesce(p.address, bp.normalized_address),
      coalesce(p.city, bp.city),
      coalesce(p.state, bp.state, 'TX'),
      p.owner_name,
      p.owner_address,
      coalesce(p.building_sqft, p.land_sqft, 0),
      p.year_built,
      p.property_type,
      coalesce(p.latitude, bp.latitude),
      coalesce(p.longitude, bp.longitude)
)
select * from building_matches
order by latest_permit_date desc nulls last;
"""

cur.execute(sql)
rows = cur.fetchall()
print(f"Total Buildings returned for New View Roofing: {len(rows)}")
for r in rows[:5]:
    print("  Address:", r[2], "| City:", r[3], "| Owner:", r[5], "| SqFt:", r[7], "| Permits:", r[11], "| Latest Date:", r[13])

conn.close()

