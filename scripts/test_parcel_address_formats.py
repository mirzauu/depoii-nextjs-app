import sqlite3
import re

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Test matching 2845 LEE ST
print("Testing '2845 LEE ST':")
cur.execute("SELECT account, address, owner FROM parcels WHERE UPPER(address) LIKE '%LEE%'")
for r in cur.fetchall()[:5]:
    print(" ", r)

# Test '2832 SHORECREST'
print("\nTesting '2832 SHORECREST':")
cur.execute("SELECT account, address, owner FROM parcels WHERE UPPER(address) LIKE '%SHORECREST%'")
for r in cur.fetchall()[:5]:
    print(" ", r)

# Test '9787 CLIFFORD'
print("\nTesting 'CLIFFORD':")
cur.execute("SELECT account, address, owner FROM parcels WHERE UPPER(address) LIKE '%CLIFFORD%'")
for r in cur.fetchall()[:5]:
    print(" ", r)

# Test '2510 FLORENCE'
print("\nTesting 'FLORENCE':")
cur.execute("SELECT account, address, owner FROM parcels WHERE UPPER(address) LIKE '%FLORENCE%'")
for r in cur.fetchall()[:5]:
    print(" ", r)

# Check total commercial parcels in parcels table vs residential
cur.execute("SELECT COUNT(*) FROM parcels WHERE city = 'Dallas'")
print(f"\nTotal Dallas parcels in DB: {cur.fetchone()[0]:,}")

conn.close()

