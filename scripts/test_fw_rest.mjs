import https from 'https';

// Test query Fort Worth's ArcGIS Open Data endpoint for CFW Development Permits
const url = "https://gis.fortworthtexas.gov/arcgis/rest/services/OpenData/CFW_Development_Permits/FeatureServer/0/query?where=ContractorName+LIKE+'%25EMPIRE%25'+OR+Description+LIKE+'%25EMPIRE%25'&outFields=*&f=json&resultRecordCount=20";

console.log('Testing Fort Worth FeatureServer...');
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.features) {
        console.log(`Success! Found ${json.features.length} features.`);
        console.log('Sample feature attributes:', json.features[0]?.attributes);
      } else {
        console.log('Error/Response:', json);
      }
    } catch (e) {
      console.log('Raw output:', data.slice(0, 300));
    }
  });
}).on('error', err => console.error('Error:', err));

