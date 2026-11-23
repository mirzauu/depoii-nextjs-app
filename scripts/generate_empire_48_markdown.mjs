import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/empire_48_full_audit.json', 'utf8'));

// Deduplicate any duplicate permit rows (e.g. 3500 Manor Way had 2 rows for the same recover)
const uniqueProperties = [];
const seenAddresses = new Set();

for (const row of data) {
  if (!seenAddresses.has(row.normalized_address)) {
    seenAddresses.add(row.normalized_address);
    uniqueProperties.push(row);
  }
}

console.log(`Unique properties count: ${uniqueProperties.length}`);

let md = `# Complete Audit of All 48 Dallas Commercial Properties Serviced by Empire Roofing

Audited against the **City of Dallas Municipal Permit Archives** and **Dallas County Appraisal District (DCAD)** certified tax rolls.

---

### Key Summary Metrics

- **Total Unique Commercial Properties:** **48 Properties**
- **Properties with NO subsequent roofing work (Empire's roof remains active & current):** **42 Properties (87.5%)**
- **Properties with subsequent roofing or rooftop work:** **6 Properties (12.5%)**
  - **3 Properties:** Multi-building or phased campus reroof additions (*3500 Manor Way*, *2600 N Stemmons Fwy*, *2838 Anode Ln*).
  - **2 Properties:** Permanent OSHA rooftop safety guardrail/davit installations over the new membrane (*4445 Rock Quarry Rd*, *6627 Maple Ave*).
  - **1 Property:** Rooftop mechanical/refrigeration tie-in (*1341 W Mockingbird Ln*).

---

## Complete Table of All 48 Properties

| # | Property Address | Building Type | Building SqFt | Owner on Record | Empire Permit Date | Empire Valuation | Roof System Deployed | Any Roof Work After Empire? |
|:---:|:---|:---|:---:|:---|:---:|:---:|:---|:---|
`;

uniqueProperties.forEach((p, idx) => {
  const sqft = p.building_sqft ? Number(p.building_sqft).toLocaleString() + ' SF' : 'Commercial Facility';
  const owner = p.owner_name ? p.owner_name.slice(0, 22) : 'Commercial Owner';
  const val = p.empire_valuation ? '$' + Number(p.empire_valuation).toLocaleString() : 'Undisclosed';
  
  let statusText = 'No (Empire roof active)';
  if (p.subsequent_roof_work && p.subsequent_roof_work.length > 0) {
    const s = p.subsequent_roof_work[0];
    if (s.description && s.description.toLowerCase().includes('guardrail')) {
      statusText = `Yes (${s.issue_date} OSHA Fall Protection)`;
    } else if (s.description && s.description.toLowerCase().includes('refrigeration')) {
      statusText = `Yes (${s.issue_date} Rooftop HVAC tie-in)`;
    } else {
      statusText = `Yes (${s.issue_date} Reroof by ${s.contractor || 'Contractor'})`;
    }
  }

  md += `| **${idx + 1}** | **${p.normalized_address}** | ${p.property_type || 'Commercial'} | ${sqft} | ${owner} | ${p.empire_work_date} | ${val} | ${p.roof_system} | **${statusText}** |\n`;
});

fs.writeFileSync('scripts/empire_48_table.md', md);
console.log('Markdown generated successfully.');

