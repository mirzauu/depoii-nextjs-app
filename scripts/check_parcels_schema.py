import psycopg2
import sqlite3

def check_schema():
    # Postgres
    db_url = None
    with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
                break
    pg_conn = psycopg2.connect(db_url, sslmode='require')
    pg_cur = pg_conn.cursor()
    pg_cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='warehouse' AND table_name='parcels'")
    print("Postgres warehouse.parcels columns:")
    for r in pg_cur.fetchall():
        print(" ", r)
    pg_conn.close()

    # SQLite
    sl_conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
    sl_cur = sl_conn.cursor()
    sl_cur.execute("PRAGMA table_info(parcels)")
    print("\nSQLite parcels columns:")
    for r in sl_cur.fetchall():
        print(" ", r)
    sl_conn.close()

check_schema()

