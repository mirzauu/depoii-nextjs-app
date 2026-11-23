import sqlite3
import os

dbs = [
    'd:/Depoii_nextjs/data/depoii.sqlite',
    'd:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db',
    'd:/Depoii_nextjs/audit/depoii_local_audit_copy.db',
    'd:/Depoii_nextjs/landing-sites/depoii-landing-build/data/depoii.sqlite',
    'd:/Depoii_nextjs/.next/standalone/data/depoii.sqlite'
]

for db in dbs:
    if not os.path.exists(db):
        continue
    size_mb = os.path.getsize(db) / (1024 * 1024)
    print(f"\nDB: {db} ({size_mb:.2f} MB)")
    try:
        conn = sqlite3.connect(db)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        print("  Tables:", tables[:8])
        if 'permits' in tables:
            cur.execute("SELECT COUNT(*) FROM permits")
            total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM permits WHERE contractor_name LIKE '%New View%' OR contractor_name LIKE '%MOB%'")
            nv = cur.fetchone()[0]
            print(f"  permits: {total} total, {nv} under New View / MOB")
        conn.close()
    except Exception as e:
        print("  Error:", e)

