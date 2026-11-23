with open('src/components/intelligence/contractor-dialog.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('TabsContent value="permits"')
print("Found TabsContent permits at:", idx)
if idx != -1:
    print(text[idx:idx+2500].encode('ascii', 'replace').decode('ascii'))
