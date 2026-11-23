import https from 'https';

// Query NewPermit_2008_2024 FeatureServer for Empire Roofing in WORK_DESCRIPTION or COMMENTS
const baseUrl = "https://services2.arcgis.com/rwnOSbfKSwyTBcwN/arcgis/rest/services/NewPermit_2008_2024/FeatureServer/0/query";
const queryParams = "?where=WORK_DESCRIPTION+LIKE+'%25EMPIRE%25'+OR+COMMENTS+LIKE+'%25EMPIRE%25'&outFields=PERMIT_No,ADDRESS,ISSUE_DATE,VALUE,WORK_DESCRIPTION,PERMIT_TYPE,COMMENTS&f=json&resultRecordCount=20";

console.log('Querying Dallas POSSE 1971-2024 FeatureServer for EMPIRE...');
https.get(baseUrl + queryParams, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.features) {
        console.log(`Success! Found ${json.features.length} permits in Dallas POSSE archive.`);
        for (const f of json.features.slice(0, 10)) {
          const a = f.attributes;
          const dateStr = a.ISSUE_DATE ? new Date(a.ISSUE_DATE).toISOString().split('T')[0] : 'N/A';
          console.log(`- [${a.PERMIT_No}] ${a.ADDRESS} (${dateStr}) - Val: $${a.VALUE} - Type: ${a.PERMIT_TYPE} - Desc: ${a.WORK_DESCRIPTION?.slice(0, 60)}...`);
        }
      } else {
        console.log('Response:', json);
      }
    } catch (e) {
      console.log('Error:', data.slice(0, 200));
    }
  });
}).on('error', console.error);

