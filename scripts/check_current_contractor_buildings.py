with open('d:/Depoii_nextjs/src/lib/warehouse.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx_start = text.find('export async function contractorBuildings')
idx_end = text.find('export async function locations')
print("Current contractorBuildings in warehouse.ts:")
print(text[idx_start:idx_start+600])
