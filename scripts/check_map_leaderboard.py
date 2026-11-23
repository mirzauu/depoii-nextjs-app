with open('d:/Depoii_nextjs/src/lib/engine-api.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('mapLeaderboard')
print(text[idx:idx+1500])

