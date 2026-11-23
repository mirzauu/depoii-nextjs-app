with open('d:/Depoii_nextjs/src/components/intelligence/contractor-dialog.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
tabs = re.findall(r'<TabsTrigger\s+value="([^"]+)">([^<]+)</TabsTrigger>', text)
print('Current Contractor Dialog tabs:', tabs)

