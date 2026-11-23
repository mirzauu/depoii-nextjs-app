import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

test_addrs = [
    '2845 LEE ST',
    '2832 SHORECREST DR',
    '9787 CLIFFORD DR',
    '2510 FLORENCE ST',
    '14900 LASATER RD',
    '2704 2ND AVE',
    '14311 SKYFROST DR',
    '15950 DALLAS PKWY',
    '2901 BOTHAM JEAN BLVD',
    '4801 MONARCH ST',
    '2800 SOUTH BLVD',
    '1216 DOLTON DR',
    '4051 BUENA VISTA ST'
]

print("Checking local parcels table for test addresses:")
for addr in test_addrs:
    cur.execute("SELECT account, address, owner FROM parcels WHERE address LIKE ? LIMIT 1", (f"%{addr}%",))
    row = cur.fetchone()
    if row:
        print(f"FOUND IN LOCAL DB: '{addr}' -> {row[0]} | {row[1]} | {row[2]}")
    else:
        print(f"NOT FOUND: '{addr}'")

conn.close()

