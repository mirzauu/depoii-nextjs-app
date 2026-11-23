with open('d:/Depoii_nextjs/src/app/api/engine/[...path]/route.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = 'case "contractors/profile": return wh.contractorProfile(q);'
replacement = 'case "contractors/profile": return wh.contractorProfile(q);\n    case "contractors/buildings": return wh.contractorBuildings(q);'

if target in text:
    new_text = text.replace(target, replacement, 1)
    with open('d:/Depoii_nextjs/src/app/api/engine/[...path]/route.ts', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("SUCCESS: replaced target in route.ts")
else:
    print("TARGET NOT FOUND in route.ts")

