import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/empire_48_full_audit.json', 'utf8'));

// Deduplicate unique properties
const seen = new Set();
const properties = [];

for (const row of data) {
  if (!seen.has(row.normalized_address)) {
    seen.add(row.normalized_address);
    properties.push(row);
  }
}

// Current reference year: 2026 (based on system environment time: November 2026)
const CURRENT_YEAR = 2026;

const ageDistribution = {
  '0 to 2 Years (Brand New / Pristine)': 0,
  '3 to 5 Years (Young / Low Risk)': 0,
  '6 to 8 Years (Mid-Life / Solid Condition)': 0,
  '9+ Years (Mature)': 0
};

const enriched = properties.map(p => {
  // Determine authoritative latest roof date: if a competitor reroofed after Empire, use that date; else use Empire's date
  let latestRoofDate = p.empire_work_date;
  let basis = "Empire Roofing (" + p.empire_work_date + ")";
  
  if (p.subsequent_roof_work && p.subsequent_roof_work.length > 0) {
    const actualReroofs = p.subsequent_roof_work.filter(s => 
      !s.description.toLowerCase().includes('guardrail') && 
      !s.description.toLowerCase().includes('refrigeration')
    );
    if (actualReroofs.length > 0) {
      const latest = actualReroofs[actualReroofs.length - 1];
      latestRoofDate = latest.issue_date;
      basis = `${latest.contractor || 'Follow-on Roofer'} (${latest.issue_date})`;
    }
  }
  
  const roofYear = parseInt(latestRoofDate.split('-')[0]);
  const ageYears = Math.max(0, CURRENT_YEAR - roofYear);
  
  if (ageYears <= 2) ageDistribution['0 to 2 Years (Brand New / Pristine)']++;
  else if (ageYears <= 5) ageDistribution['3 to 5 Years (Young / Low Risk)']++;
  else if (ageYears <= 8) ageDistribution['6 to 8 Years (Mid-Life / Solid Condition)']++;
  else ageDistribution['9+ Years (Mature)']++;
  
  return {
    address: p.normalized_address,
    building_type: p.property_type || 'Commercial',
    sqft: p.building_sqft ? Number(p.building_sqft).toLocaleString() + ' SF' : 'Commercial Facility',
    owner: p.owner_name ? p.owner_name.slice(0, 22) : 'Commercial Owner',
    empire_date: p.empire_work_date,
    latest_roof_date: latestRoofDate,
    roof_age_years: ageYears,
    basis: basis,
    valuation: p.empire_valuation ? '$' + Number(p.empire_valuation).toLocaleString() : 'Commercial'
  };
});

// Sort by roof age (youngest to oldest)
enriched.sort((a, b) => a.roof_age_years - b.roof_age_years);

console.log('Age Distribution:', ageDistribution);
fs.writeFileSync('scripts/empire_48_ages.json', JSON.stringify({ ageDistribution, properties: enriched }, null, 2));

