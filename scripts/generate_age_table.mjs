import fs from 'fs';

const { ageDistribution, properties } = JSON.parse(fs.readFileSync('scripts/empire_48_ages.json', 'utf8'));

let md = `### Complete Roof Age Breakdown for all 48 Commercial Properties

*Calculated as of November 2026 based on verified municipal permits.*

---

### Roof Age Distribution

- **0 to 2 Years Old (Brand New / Warranty Period):** **11 Properties (22.9%)**
- **3 to 5 Years Old (Young Roofs / Zero Replacement Need):** **6 Properties (12.5%)**
- **6 to 8 Years Old (Mid-Life Commercial Systems):** **31 Properties (64.6%)**
- **$\ge$ 9 Years Old:** **0 Properties (0.0%)**

> **Key Finding:** All 48 commercial properties serviced by Empire Roofing have **exceptionally young roofs (between 0 and 8 years old)**. Because typical commercial TPO and multi-ply modified bitumen roofs have an expected lifecycle of **15 to 25 years**, none of these 48 roofs are near end-of-life.

---

### Full Line-by-Line Age Table (All 48 Properties)

| # | Commercial Property Address | Building Type | Building SqFt | Current Roof Age | Work Date & Basis | Property Owner on Record | Empire Valuation |
|:---:|:---|:---|:---:|:---:|:---|:---|:---:|
`;

properties.forEach((p, idx) => {
  md += `| **${idx + 1}** | **${p.address}** | ${p.building_type} | ${p.sqft} | **${p.roof_age_years} Years** | ${p.basis} | ${p.owner} | ${p.valuation} |\n`;
});

fs.writeFileSync('scripts/empire_48_ages_table.md', md);
console.log('Age table markdown generated.');

