import https from 'https';

// Query item metadata to get exact service URL
const itemUrl = "https://www.arcgis.com/sharing/rest/content/items/d2740f4d746b4bfaa03e25de0376238b?f=json";

console.log('Fetching ArcGIS item metadata...');
https.get(itemUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Item Title:', json.title);
      console.log('Item Service URL:', json.url);
    } catch (e) {
      console.log('Raw:', data.slice(0, 300));
    }
  });
}).on('error', err => console.error('Error:', err));

