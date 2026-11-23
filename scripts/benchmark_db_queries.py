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

# 1. Profile query benchmark & EXPLAIN
t0 = time.time()
cur.execute("""
    EXPLAIN ANALYZE
    select c.*
    from warehouse.canonical_contractors c
    where lower(c.canonical_name) = lower('New View Roofing')
       or c.id = 'New View Roofing'
       or lower(c.canonical_name) like lower('New View Roofing') || ' %'
       or lower('New View Roofing') like lower(c.canonical_name) || ' %'
       or lower(c.canonical_name) like lower(split_part('New View Roofing', ' (', 1)) || '%'
    order by 
      case 
        when lower(c.canonical_name) = lower('New View Roofing') then 0 
        when c.id = 'New View Roofing' then 1
        else 2 
      end
    limit 1;
""")
print("=== CANONICAL CONTRACTORS EXPLAIN ===")
for r in cur.fetchall():
    print(r[0])
print(f"Time: {time.time()-t0:.2f}s")

# 2. Check indexes on normalized_permits
cur.execute("""
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'warehouse' AND tablename = 'normalized_permits';
""")
print("\n=== INDEXES ON warehouse.normalized_permits ===")
for r in cur.fetchall():
    print(r[0], "->", r[1])

# 3. Check indexes on parcels
cur.execute("""
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'warehouse' AND tablename = 'parcels';
""")
print("\n=== INDEXES ON warehouse.parcels ===")
for r in cur.fetchall():
    print(r[0], "->", r[1])

conn.close()

