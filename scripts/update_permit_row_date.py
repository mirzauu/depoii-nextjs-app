with open('src/lib/warehouse.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = 'issueDate: r.date_quality === "source" && r.issue_date ? toIsoDate(r.issue_date) : null,'
replacement = 'issueDate: r.issue_date ? toIsoDate(r.issue_date) : null,'

assert target in text, "Target not found in warehouse.ts"
text = text.replace(target, replacement, 1)

with open('src/lib/warehouse.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated warehouse.ts successfully!")
