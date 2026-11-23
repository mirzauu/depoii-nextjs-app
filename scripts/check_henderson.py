import psycopg2

db_url = None
with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

# Check what permits exist for this address
cur.execute('''
  select id, raw_permit_number, normalized_address, city, state, issue_date, valuation, category, probable_roof_system, raw_description
  from warehouse.normalized_permits
  where normalized_address ilike '%2401%HENDERSON%'
''')
print("Permits at 2401 Henderson:")
for r in cur.fetchall():
    print(r)

# Check if there is a parcel at 2401 Henderson
cur.execute('''
  select id, account_number, address, city, property_type, owner_name, building_sqft, year_built
  from warehouse.parcels
  where address ilike '%2401%HENDERSON%'
''')
print("\nParcels at 2401 Henderson:")
for r in cur.fetchall():
    print(r)

