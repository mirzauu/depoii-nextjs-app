import psycopg2
import time

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

# Test 1: Clean equality on parcel_id
t0 = time.time()
cur.execute("""
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
             pm.raw_description,
             pm.latitude,
             pm.longitude
      from warehouse.normalized_permits pm
      where lower(pm.contractor_name) = lower('New View Roofing')
         or pm.contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'
    )
    select count(*)
    from base_permits bp
    left join warehouse.parcels p on (
      bp.parcel_id is not null and bp.parcel_id <> '' and p.id = bp.parcel_id
    );
""")
print(f"Test 1 (Direct ID join): {time.time()-t0:.3f}s, result: {cur.fetchone()[0]}")

# Test 2: Standardized address match without trim in join condition
t0 = time.time()
cur.execute("""
    with base_permits as (
      select pm.id as permit_id,
             pm.raw_permit_number,
             pm.parcel_id,
             lower(trim(pm.normalized_address)) as addr_key,
             lower(pm.city) as city_key,
             pm.city,
             pm.state,
             pm.issue_date,
             pm.valuation,
             pm.category,
             pm.probable_roof_system,
             pm.raw_description,
             pm.latitude,
             pm.longitude
      from warehouse.normalized_permits pm
      where lower(pm.contractor_name) = lower('New View Roofing')
         or pm.contractor_id = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'
    )
    select count(*)
    from base_permits bp
    left join warehouse.parcels p on (
      lower(p.address) = bp.addr_key and lower(p.city) = bp.city_key
    );
""")
print(f"Test 2 (Indexed address join): {time.time()-t0:.3f}s, result: {cur.fetchone()[0]}")

conn.close()

