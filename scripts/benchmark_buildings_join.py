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

# Test the buildings join
t0 = time.time()
cur.execute("""
    EXPLAIN ANALYZE
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
      (bp.parcel_id is not null and bp.parcel_id <> '' and (p.id = bp.parcel_id or p.account_number = bp.parcel_id))
      or (lower(trim(p.address)) = lower(trim(bp.normalized_address)) and lower(p.city) = lower(bp.city))
    );
""")
print("=== BUILDINGS JOIN EXPLAIN ANALYZE ===")
for r in cur.fetchall():
    print(r[0])
print(f"Elapsed: {time.time()-t0:.2f}s")

conn.close()

