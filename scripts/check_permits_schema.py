import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()
cur.execute("PRAGMA table_info(permits)")
cols = cur.fetchall()
for c in cols:
    print(f"Col {c[1]}: type={c[2]}, notnull={c[3]}, dflt_value={c[4]}, pk={c[5]}")
conn.close()

