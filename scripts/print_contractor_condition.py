with open('d:/Depoii_nextjs/src/lib/warehouse.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('if (str(q, "contractor"))')
print(text[idx-50:idx+250])

