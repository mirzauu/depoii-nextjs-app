with open('d:/Depoii_nextjs/src/lib/warehouse.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('export async function locations')
print("Position of locations in warehouse.ts:", idx)
print(text[idx-200:idx+100])

