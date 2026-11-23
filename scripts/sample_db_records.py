import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()
cur.execute('SELECT * FROM parcels LIMIT 1')
print('Sample parcel:', cur.fetchone())

cur.execute("SELECT permit_no, address, lat, lng, parcel_ids FROM permits WHERE parcel_ids != '[]' LIMIT 1")
print('Sample matched permit:', cur.fetchone())

conn.close()

