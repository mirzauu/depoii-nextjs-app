import psycopg2
import json

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

# 1. Test contractorProfile warehouse query simulation
cur.execute("""
    select c.*
    from warehouse.canonical_contractors c
    where lower(c.canonical_name) = lower('New View Roofing')
       or c.id = 'New View Roofing'
       or lower(c.canonical_name) like lower('New View Roofing') || ' %'
       or lower('New View Roofing') like lower(c.canonical_name) || ' %'
    limit 1
""")
row = cur.fetchone()
cols = [d[0] for d in cur.description]
contractor_dict = dict(zip(cols, row)) if row else {}

print("=== CANONICAL CONTRACTOR LOOKUP SIMULATION ===")
for k in ['id', 'canonical_name', 'primary_license', 'headquarters_city', 'total_permits', 'total_valuation', 'primary_roof_system', 'website_url', 'phone_number', 'leadership', 'manufacturer_certifications', 'bbb_rating', 'bbb_accredited', 'bbb_profile_url']:
    print(f"  {k}: {contractor_dict.get(k)}")

# 2. Test permits lookup simulation
cur.execute("""
    select count(*), coalesce(sum(valuation),0)
    from warehouse.normalized_permits
    where lower(contractor_name) = lower('New View Roofing')
""")
p_count, p_val = cur.fetchone()
print(f"\n=== PERMITS AGGREGATION IN WAREHOUSE ===")
print(f"  Total Permits Filed under 'New View Roofing': {p_count}")
print(f"  Total Valuation: ${p_val:,.2f}")

# 3. Sample 5 most recent permits
cur.execute("""
    select raw_permit_number, city, normalized_address, issue_date, valuation, category, raw_description
    from warehouse.normalized_permits
    where lower(contractor_name) = lower('New View Roofing')
    order by issue_date desc nulls last
    limit 5
""")
print(f"\n=== SAMPLE 5 RECENT PERMITS FOR UI TAB ===")
for p in cur.fetchall():
    print(f"  {p[0]} | {p[1]} | {p[2]} | {p[3]} | ${p[4]:,.0f} | {p[5]} | {p[6][:50] if p[6] else ''}")

conn.close()
