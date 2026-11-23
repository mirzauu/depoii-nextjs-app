import fs from 'fs';

const rawHail = JSON.parse(fs.readFileSync('scripts/empire_older_roofs_hail.json', 'utf8'));

// Group by unique property address
const byProp = {};
for (const r of rawHail) {
  const addr = r.property_address.toUpperCase().trim();
  if (!byProp[addr]) {
    byProp[addr] = {
      address: r.property_address,
      roof_age: r.roof_age_years,
      install_date: r.roof_installed_date,
      hail_events: []
    };
  }
  byProp[addr].hail_events.push({
    storm_date: r.storm_date,
    hail_size_inches: r.hail_size_inches,
    location: r.hail_city,
    distance_miles: r.distance_miles,
    remark: r.remark
  });
}

console.log(`Unique properties with confirmed severe hail: ${Object.keys(byProp).length}`);
for (const [k, v] of Object.entries(byProp)) {
  const maxHail = Math.max(...v.hail_events.map(e => e.hail_size_inches));
  const latestDate = v.hail_events[0].storm_date;
  console.log(`- ${v.address} (Age: ${v.roof_age} yrs, installed ${v.install_date}): Max Hail ${maxHail}" on ${latestDate} (${v.hail_events[0].distance_miles} mi)`);
}

fs.writeFileSync('scripts/empire_hail_summary.json', JSON.stringify(byProp, null, 2));

