with open('d:/Depoii_nextjs/src/app/api/engine/[...path]/route.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('contractors/profile')
print(text[idx-50:idx+250])

