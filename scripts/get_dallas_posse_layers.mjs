import https from 'https';

// Fetch item data for 61efba71088445968a6bff18fd7d1399
const url = "https://www.arcgis.com/sharing/rest/content/items/61efba71088445968a6bff18fd7d1399/data?f=json";

console.log('Fetching WebMap operational layers...');
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('BaseMap title:', json.baseMap?.title);
      console.log('Operational Layers count:', json.operationalLayers?.length);
      if (json.operationalLayers) {
        for (const l of json.operationalLayers) {
          console.log(`Layer: ${l.title} -> URL: ${l.url}`);
        }
      }
    } catch (e) {
      console.log('Raw output:', data.slice(0, 300));
    }
  });
}).on('error', console.error);

