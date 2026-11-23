import https from 'https';

// Test query Fort Worth's FeatureServer for total count of roofing permits
const baseUrl = "https://services5.arcgis.com/3ddLCBXe1bRt7mzj/arcgis/rest/services/CFW_Open_Data_Development_Permits_View/FeatureServer/0/query";
const queryParams = "?where=B1_WORK_DESC+LIKE+'%25ROOF%25'+OR+Permit_SubType+LIKE+'%25ROOF%25'&returnCountOnly=true&f=json";

https.get(baseUrl + queryParams, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Total Fort Worth Roofing Permits Available:', json.count);
    } catch (e) {
      console.log('Error:', data.slice(0, 200));
    }
  });
}).on('error', console.error);

