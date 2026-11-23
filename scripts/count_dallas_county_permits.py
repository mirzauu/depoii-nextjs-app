import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Check all cities in permits table
cur.execute("""
    SELECT city, COUNT(*) 
    FROM permits 
    GROUP BY city 
    ORDER BY COUNT(*) DESC
""")
city_counts = cur.fetchall()
print("Permits count by city in depoii.sqlite:")
total_permits = 0
for city, cnt in city_counts:
    print(f"  {city}: {cnt}")
    total_permits += cnt

# Dallas County municipalities typically include:
# Dallas, Irving, Garland, Grand Prairie, Mesquite, Carrollton, Richardson, Addison,
# Farmers Branch, Balch Springs, Duncanville, Lancaster, DeSoto, Cedar Hill, Rowlett,
# Coppell, University Park, Highland Park, Seagoville, Cockrell Hill, Hutchins, Wilmer, Sunnyvale
dallas_county_cities = [
    'Dallas', 'Irving', 'Garland', 'Grand Prairie', 'Mesquite', 'Carrollton',
    'Richardson', 'Addison', 'Farmers Branch', 'Balch Springs', 'Duncanville',
    'Lancaster', 'DeSoto', 'Cedar Hill', 'Rowlett', 'Coppell', 'University Park',
    'Highland Park', 'Seagoville', 'Cockrell Hill', 'Hutchins', 'Wilmer', 'Sunnyvale'
]

placeholders = ','.join(['?'] * len(dallas_county_cities))
cur.execute(f"""
    SELECT COUNT(*) 
    FROM permits 
    WHERE city IN ({placeholders})
""", dallas_county_cities)
dallas_county_total = cur.fetchone()[0]

cur.execute(f"""
    SELECT city, COUNT(*) 
    FROM permits 
    WHERE city IN ({placeholders})
    GROUP BY city
    ORDER BY COUNT(*) DESC
""", dallas_county_cities)
dallas_county_breakdown = cur.fetchall()

print(f"\nTotal permits in Dallas County cities: {dallas_county_total}")
print("Breakdown for Dallas County cities:")
for c, cnt in dallas_county_breakdown:
    print(f"  {c}: {cnt}")

# Check Data Engine (depoii_local.db) as well for full context
conn_de = sqlite3.connect('d:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db')
cur_de = conn_de.cursor()
cur_de.execute(f"""
    SELECT COUNT(*) 
    FROM normalized_permits 
    WHERE city IN ({placeholders})
""", dallas_county_cities)
de_dallas_county_total = cur_de.fetchone()[0]

cur_de.execute(f"""
    SELECT city, COUNT(*) 
    FROM normalized_permits 
    WHERE city IN ({placeholders})
    GROUP BY city
    ORDER BY COUNT(*) DESC
""", dallas_county_cities)
de_dallas_county_breakdown = cur_de.fetchall()

print(f"\nTotal permits in Data Engine (depoii_local.db) for Dallas County cities: {de_dallas_county_total}")
print("Data Engine Breakdown (Top 10):")
for c, cnt in de_dallas_county_breakdown[:10]:
    print(f"  {c}: {cnt}")

conn.close()
conn_de.close()

