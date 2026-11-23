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

# Test 1: contractors/profile aggregation
t0 = time.time()
cur.execute("""
    select count(*)::text as permits,
            coalesce(sum(p.valuation),0)::text as val,
            (array_agg(p.probable_roof_system order by p.valuation desc))[1] as roof_system,
            (array_agg(p.jurisdiction order by p.valuation desc))[1] as jurisdiction,
            (array_agg(p.contractor_license))[1] as license
     from warehouse.normalized_permits p
     where lower(p.contractor_name) = lower('New View Roofing');
""")
row1 = cur.fetchone()
print(f"Contractor profile pAgg: {time.time()-t0:.2f}s -> {row1}")

# Test 2: permitsSearch when contractor is provided
t0 = time.time()
cur.execute("""
    select count(*)::text as total, coalesce(sum(valuation),0)::text as val 
    from warehouse.normalized_permits p 
    where lower(p.contractor_name) like '%new view roofing%';
""")
row2 = cur.fetchone()
print(f"Permits search count: {time.time()-t0:.2f}s -> {row2}")

conn.close()

