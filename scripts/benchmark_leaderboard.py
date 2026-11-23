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

# Test 1: EXPLAIN ANALYZE on contractors leaderboard query
t0 = time.time()
cur.execute("""
    EXPLAIN ANALYZE
    with top_contractors as (
       select p.contractor_name as name,
              count(*)::text as permits,
              coalesce(sum(p.valuation),0)::text as val,
              (array_agg(p.probable_roof_system order by p.valuation desc))[1] as roof_system,
              (array_agg(p.jurisdiction order by p.valuation desc))[1] as jurisdiction,
              (array_agg(p.contractor_license))[1] as license
       from warehouse.normalized_permits p
       where p.contractor_name is not null and p.contractor_name <> ''
       group by p.contractor_name
       order by sum(p.valuation) desc nulls last
       limit 2000
    )
    select * from top_contractors;
""")
print(f"Leaderboard without ROOFING_SQL regex: {time.time()-t0:.2f}s")

# Test 2: Check has_contact index or canonical_contractors index
cur.execute("""
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'warehouse' AND tablename = 'canonical_contractors';
""")
print("\n=== INDEXES ON canonical_contractors ===")
for r in cur.fetchall():
    print(r[0], "->", r[1])

conn.close()

