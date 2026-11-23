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

# Test LIKE '%New View Roofing%' vs '=' on lower(contractor_name)
t0 = time.time()
cur.execute("""
    select count(*)::text as total, coalesce(sum(valuation),0)::text as val 
    from warehouse.normalized_permits p 
    where lower(p.contractor_name) = lower('New View Roofing');
""")
r1 = cur.fetchone()
t1 = time.time() - t0

t0 = time.time()
cur.execute("""
    select count(*)::text as total, coalesce(sum(valuation),0)::text as val 
    from warehouse.normalized_permits p 
    where lower(p.contractor_name) like '%new view roofing%';
""")
r2 = cur.fetchone()
t2 = time.time() - t0

print(f"Equality '=' took: {t1*1000:.1f}ms (Result: {r1})")
print(f"Wildcard 'LIKE %...%' took: {t2*1000:.1f}ms (Result: {r2})")

conn.close()

