with open('src/components/parcel-detail-drawer.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update import
target_import = 'import { num, usd } from "@/lib/format";'
repl_import = 'import { num, usd, shortDate } from "@/lib/format";'
assert target_import in text, "target_import not found"
text = text.replace(target_import, repl_import, 1)

# 2. Update permit date rendering
target_date = '{[pm.issued, pm.status].filter(Boolean).join(" · ")}'
# In case the dot is different:
idx = text.find('pm.issued, pm.status')
print("Found pm.issued, pm.status at:", idx)
snippet = text[idx-20:idx+60]
print("Snippet around pm.issued:", repr(snippet))

repl_date = '{[pm.issued ? shortDate(pm.issued) : null, pm.status].filter(Boolean).join(" · ")}'
text = text.replace(snippet, '{[pm.issued ? shortDate(pm.issued) : null, pm.status].filter(Boolean).join(" · ")}', 1)

with open('src/components/parcel-detail-drawer.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated parcel-detail-drawer.tsx successfully!")
