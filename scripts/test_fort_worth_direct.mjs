import https from 'https';

// Test query Fort Worth's FeatureServer for roofing keywords in B1_WORK_DESC or Permit_Type
const baseUrl = "https://services5.arcgis.com/3ddLCBXe1bRt7mzj/arcgis/rest/services/CFW_Open_Data_Development_Permits_View/FeatureServer/0/query";
const queryParams = "?where=B1_WORK_DESC+LIKE+'%25ROOF%25'+OR+Permit_SubType+LIKE+'%25ROOF%25'&outFields=Permit_No,Full_Street_Address,File_Date,JobValue,B1_WORK_DESC,Current_Status&f=json&resultRecordCount=10";

console.log('Querying City of Fort Worth official FeatureServer for ROOF...');
https.get(baseUrl + queryParams, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.features) {
        console.log(`SUCCESS! Found ${json.features.length} live roofing permits.`);
        for (const f of json.features.slice(0, 5)) {
          const a = f.attributes;
          const dateStr = a.File_Date ? new Date(a.File_Date).toISOString().split('T')[0] : 'N/A';
          console.log(`- [${a.Permit_No}] ${a.Full_Street_Address} (${dateStr}) - Val: $${a.JobValue} - Desc: ${a.B1_WORK_DESC?.slice(0, 80)}...`);
        }
      }
    } catch (e) {
      console.log('Error:', data.slice(0, 200));
    }
  });
}).on('error', console.error);
