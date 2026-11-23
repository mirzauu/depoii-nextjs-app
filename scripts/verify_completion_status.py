import sqlite3

dbs = [
    'd:/Depoii_nextjs/data/depoii.sqlite',
    'd:/Depoii_nextjs/landing-sites/depoii-landing-build/data/depoii.sqlite',
    'd:/Depoii_nextjs/.next/standalone/data/depoii.sqlite'
]

for db in dbs:
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM permits")
    tot = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM permits WHERE city = 'Dallas' AND SUBSTR(issued, 1, 4) BETWEEN '2018' AND '2024'")
    dal_enriched = cur.fetchone()[0]
    print(f"{db}:")
    print(f"  Total Permits: {tot:,}")
    print(f"  Dallas 2018-2024 Permits: {dal_enriched:,}")
    conn.close()

