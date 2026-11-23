import urllib.request
import urllib.parse
import http.cookiejar
import re
from bs4 import BeautifulSoup

def query_accela(business_name=None, first_name=None, last_name=None):
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = [
        ('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
        ('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8')
    ]

    base_url = 'https://aca-prod.accela.com/dallastx/Cap/CapHome.aspx?module=Building&TabName=Building'
    print(f"\n[Accela] Initializing session for: business='{business_name}', name='{first_name} {last_name}'...")
    resp = opener.open(base_url, timeout=25)
    html = resp.read().decode('utf-8')

    # Extract all required form hidden fields
    soup = BeautifulSoup(html, 'html.parser')
    form = soup.find('form', id='aspnetForm')
    if not form:
        print("Error: Could not find aspnetForm")
        return []

    form_data = {}
    for inp in form.find_all('input'):
        name = inp.get('name')
        val = inp.get('value', '')
        if name:
            form_data[name] = val

    # Fill search fields
    busi_field = 'ctl00$PlaceHolderMain$generalSearchForm$txtGSBusiName'
    first_field = 'ctl00$PlaceHolderMain$generalSearchForm$txtGSFirstName'
    last_field = 'ctl00$PlaceHolderMain$generalSearchForm$txtGSLastName'
    
    if business_name:
        form_data[busi_field] = business_name
    if first_name:
        form_data[first_field] = first_name
    if last_name:
        form_data[last_field] = last_name

    # Trigger Search button
    form_data['ctl00$PlaceHolderMain$btnNewSearch'] = 'Search'

    # Remove irrelevant submit buttons to prevent conflicting actions
    if 'ctl00$PlaceHolderMain$btnResetSearch' in form_data:
        del form_data['ctl00$PlaceHolderMain$btnResetSearch']

    encoded_data = urllib.parse.urlencode(form_data).encode('utf-8')
    
    post_headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': base_url
    }
    
    req = urllib.request.Request(base_url, data=encoded_data, headers=post_headers)
    post_resp = opener.open(req, timeout=30)
    res_html = post_resp.read().decode('utf-8')
    
    res_soup = BeautifulSoup(res_html, 'html.parser')
    
    # Check if results table exists
    table = res_soup.find('table', id=re.compile(r'gdvPermitList|dgvPermitList', re.IGNORECASE))
    if not table:
        # Check for "no records found"
        msg = res_soup.find(text=re.compile(r'No records found|Notice|Warning', re.IGNORECASE))
        print("  Result message:", msg.strip() if msg else "No results table found.")
        return []

    rows = table.find_all('tr')
    print(f"  [FOUND] Results table with {len(rows)} rows!")
    results = []
    headers = [th.get_text(strip=True) for th in rows[0].find_all(['th', 'td'])]
    for r in rows[1:]:
        cols = [td.get_text(strip=True) for td in r.find_all('td')]
        if len(cols) == len(headers):
            results.append(dict(zip(headers, cols)))
        elif cols:
            results.append({"raw": cols})
            
    return results

if __name__ == "__main__":
    try:
        r1 = query_accela(business_name="SR1 Roofing")
        print("SR1 Roofing matches:", r1)
        
        r2 = query_accela(business_name="SR1")
        print("SR1 matches:", r2)

        r3 = query_accela(last_name="Rodden")
        print("Rodden matches:", r3)
    except Exception as e:
        print("Exception:", e)
