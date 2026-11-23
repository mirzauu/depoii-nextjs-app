import os
import re

def search_files(dir_path, patterns):
    results = []
    for root, dirs, files in os.walk(dir_path):
        if 'node_modules' in root or '.git' in root or '.next' in root:
            continue
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        for p in patterns:
                            if p in content:
                                results.append((p, full_path))
                except:
                    pass
    return results

print("Searching for contractor routes/components in src:")
matches = search_files('d:/Depoii_nextjs/src', ['contractor', 'contractors', 'Contractor', 'permit_contacts'])
for p, path in set(matches):
    print(f"[{p}] -> {path}")
